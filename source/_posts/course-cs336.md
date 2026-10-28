---
title: "CS336 学习总结：把语言模型的整条链路串起来"
date: 2026-10-11 12:22:00
updated: 2026-10-11 12:22:00
permalink: course-cs336.html
categories: [课程]
tags: [人工智能, 系统与性能]
cover: /images/covers/cover-01.webp
description: 从 BPE、Transformer 到数据处理与对齐，整理 CS336 的实现主线，以及计算资源限制下没有完整复现的部分。
---

这里整理一下 CS336 的学习记录。仓库按照五次 Assignment 保存代码、实验脚本和笔记，也有 Lecture 的记录。

## 从 tokenizer 到模型

A1 从 byte-level BPE 和 tokenizer 开始，接着实现 Linear、Embedding、RMSNorm、SwiGLU、RoPE 和注意力，再把损失函数、AdamW、训练循环和生成脚本接起来。

看单个模块的时候容易觉得自己知道它在做什么，真正串起来之后还要考虑 token 怎么变成张量、维度怎么变化，以及梯度如何传递。

## 系统、数据和对齐

A2 进入系统部分，包括 profiler、混合精度、GPU 内存、Triton、DDP 和分片训练。除了能不能训练，还要看计算、通信和显存分别花在了哪里。

A3 讨论模型规模、数据量和计算预算；A4 涉及文本提取、过滤和去重；A5 则进入 RLVR、策略梯度、GRPO 和重要性重加权。

仓库 README 将 Spring 2026 主线标记为完成。不过部分需要大规模 GPU 或 B200 的实验没有完整复现，具体实现和笔记可以看下面的仓库。

## 相关链接

[学习仓库与完成范围](https://github.com/Okazaki-Yumemi/CS336) · [实现与实验](https://github.com/Okazaki-Yumemi/CS336/tree/main/assignments) · [学习笔记](https://github.com/Okazaki-Yumemi/CS336/tree/main/notes)
