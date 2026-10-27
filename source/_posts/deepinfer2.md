---
date: 2026-10-27T08:50:02.040Z
permalink: deepinfer2.html
title: DeepInfer Part2  —— The adaptive verification of Dspark
updated: 2026-10-27T08:50:02.040Z
categories:
  - 学习
tags:
  - 人工智能
  - 系统与性能
cover: /images/bg1.png
description: ""
mathjax: false
---

# DeepInfer Part2—— DSpark的动态验证调度



简单来说，DeepInfer的设计算法是 一个**以GPU有效吞吐为目标的全局预算分配算法**

核心的思考来说，就是可以参考这篇文章的一个观察：



 Speculative Decoding: Performance or Illusion?\]([https://arxiv.org/abs/2601.11580](https://arxiv.org/abs/2601.11580))



想必看到这里的读者，其实都明白一个道理

所谓投机解码，就是一种利用GPU的多余算力，做一些额外的计算和工作，从而让核心的路径达到更高的计算速度的一种方式。Drafter做了很多额外的proposal tokens，其中只有相当一部分最终能被接受。

想必敏锐的读者到现在已经发现问题所在了。

投机解码的技术能够在单卡单请求上面得到不错的加速比例(一般是2\~5x), 其根本原因是因为一般来说我们说Decode阶段是 Memory-bound的。而投机解码 激进的计算能够提高计算强度。从而达到加速。而现在我们的目光到了serving阶段，多个请求一般来说能够直接给我们的Compute打满。到了这种时候，我们再用投机解码，被拒绝掉的token就是真正的浪费掉了、本来可以用于加速的计算能力了。

因此，如何良好的去进行验证，提高acceptance，就是speculative decoding 在 serving utilization的一个关键点。

看到这里，想必你对动机有了一个清晰的理解。

## 1. 先从一轮Decode batch入手。

现在我们假设有32条亲求，每个token都已经有5个DSpark生成的draft tokens,那么我们就需要一次验证192个token，并且每个token的接受率并不相同。



给一个高接受率的token验证全部6 tokens, and it maybe still worth it !

但是对于一个不好的draft，预测第一个可能都没用。



### 1.1 数学细节

假设confidence head给出了三个drafter tokens的置信度，我们在预测一个token是否值得接受的时候，应该采用前缀积的方式，否则可能某处自己的概率很高，但是其前面很容易被拒绝。



```cpp
void update_draft_state(
    MTPState& state,
    const vector<int>& new_drafts,
    const vector<float>& confidence
) {
    state.draft_tokens = new_drafts;

    // 保存上一轮的估计，用于异步调度
    state.prev_accept_rates = state.accept_rates;
    state.accept_rates.clear();

    float prefix_prob = 1.0f;

    for (float c : confidence) {
        prefix_prob *= c;
        state.accept_rates.push_back(prefix_prob);
    }
}
```

上述代码去除了错误处理等。可以看到核心的执行逻辑就是那个for

### 1.2 验证数的确定

假设我们已经准备好了累积概率。



DeepInfer会把所有的累积概率降序排序，选择最好的k个额外token。所以其实际的近似目标可以被考虑为是:

argmax ( B + k / T )

```cpp

// 教学版
vector<pair<float, int>> candidates;
for (int i = 0; i < requests.size(); ++i) {
    for (float p : requests[i].prefix_accept_rates) {
        candidates.emplace_back(p, i);
    }
}
sort(candidates.begin(), candidates.end(),
     [](auto a, auto b) {
         return a.first > b.first;
     });
int B = requests.size();
int best_Q = B;
double best_tps = 0.0;
double expected = B;
for (int k = 0; k <= candidates.size(); ++k) {
    int Q = B + k;
    int graph_size = select_graph_size(Q);
    double time_ms =
        estimated_forward_ms(graph_size)
        + estimated_sampler_ms(B);
    double tps = expected / time_ms;
    if (tps > best_tps) {
        best_tps = tps;
        best_Q = Q;
    }
    if (k < candidates.size())
        expected += candidates[k].first;
}
```

其中，estimated\_forward\_ms可以视作一个已有的函数，不用去细究里面的细节。

粗略的来讲，里面包含一条启动profiling得到的拟合曲线，从而根据已有的数据进行拟合，估计其具体时间。

### 1.3 怎么放到GPU上面？

我们刚刚得到了 启发式最佳的Q(本轮verification token数目)

但是在实际上，如何把他放进去去运行，也是一个很难的事情。



首先第一个困难，就是异步调度带来的数据依赖问题。

```text
传统模式下：
Schedule N -> Forward N -> verify N -> Get confidence N -> Schedule N+1
```

而Deepinfer希望做到的是，GPU在计算N轮的时候，CPU可以提前安排N +1 轮。

但此时N轮的Confidence 和 Acceptance还没有返回CPU。



所以，他们把决策拆开

- CPU: 选择全局总预算： 根据更早的历史Acceptance 估计Q
- GPU: 重新分配各个请求的验证长度，用GPU上面比较新的数据把Q分配个每个 小q

我们应该明晰一个设计: **总计算量允许我们根据历史预测去提前决定，但是实际的计算量分配应该尽可能地使用最新的信息**

我们可先看GPU侧的代码

```py

import torch
def allocate_verification(total_q, remap, prev_conf):
    """
    total_q: CPU 已确定的总验证输入数
    remap: 当前请求在上一轮 Batch 中的索引，-1 为新请求
    prev_conf: 上一轮每个请求各位置的 Confidence
    """
    B = len(remap)
    gamma = prev_conf.shape[1]
    confidence = torch.zeros(
        (B, gamma), device=prev_conf.device
    )
    valid = remap >= 0
    confidence[valid] = prev_conf[remap[valid].long()]
    # 条件概率 -> 累计前缀接受概率
    prefix_prob = torch.cumprod(confidence, dim=1)
    # 全局排序，选择最值得验证的额外 Tokens
    order = torch.argsort(
        prefix_prob.flatten(),
        descending=True,
        stable=True,
    )
    extra_budget = total_q - B
    selected = order[:extra_budget]
    extra_per_req = torch.bincount(
        selected // gamma,
        minlength=B,
    )
    return 1 + extra_per_req

```

GPU不只是修正Seqlens\_q ，因为这个地方有一个额外的细节，上一轮的acceptance也会影响KV 长度，所以在调度的时候需要注意这些信息的同步，不然很有可能导致 Attention Positions 和 KV cache Length的mismatch



## 2. Where gose Verification?

```py

def verify_and_draft_next(logits, inputs, draft_model):
    # 1. 将 Flattened Target Logits 映射回各请求
    row_to_req, pos, is_verify = prepare_verification_metadata(
        inputs.first_token_positions,
        inputs.seqlens_q,
        logits.shape[0],
        inputs.max_draft_len,
    )

    # 2. Target 对上一轮 Draft 做真正的概率验证
    sampled, accept_flags = verify_draft_probabilities(
        logits, inputs.draft_state, row_to_req, is_verify
    )

    # 3. 找到连续接受的前缀以及最终输出 Token
    result = finalize_accepted_prefix(
        sampled, accept_flags, inputs.seqlens_q
    )

    # 4. 根据本轮 Target 输出，再生成下一轮 Draft
    next_drafts = draft_model.decode_forward(
        result.final_tokens,
        result.accepted_lengths,
    )

    return result, next_drafts

```

Confidence Head 用于调度，不会负责决定接受和拒绝，因此，预测的置信度不准确可能会影响性能，但是他不会因为某个token的confidence太低就直接判断其错误。



最后在验证结束之后，调用链会回到 `LLMEngine`

Decode step 提交以下内容

- SamplerOutput: 接受的Draft Tokens , 最终采样Token, 下一轮Draft,confidence
- Process\_MTPInfo: 更新每个亲求的Draft 状态和概率估计
- Scheduler.process\_outputs() 提交输出Token,更新Sequence 和 KV states

根据它们的性能证据，他们给出:


| 并发请求数 | 固定验证长度 | 动态平均验证长度 | 动态吞吐增益 |
| ----- | ------ | -------- | ------ |
| 16    | 5.00   | 4.44     | -1.5%  |
| 32    | 5.00   | 3.65     | +1.6%  |
| 60    | 5.00   | 3.58     | +5.4%  |
| 96    | 5.00   | 3.24     | +11.0% |

**这些数据给我们以下的观察**

- 动态验证长度不是无条件有效。
- 越接近高并发的地方，减少低价值Verification通常就越有意义。
- 这个优化的收益没有2x \\ 3x 那么夸张。
