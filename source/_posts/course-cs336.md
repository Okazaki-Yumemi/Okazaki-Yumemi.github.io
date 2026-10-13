---
title: "【暂时AIGC占位】CS336 学习总结：把语言模型的整条链路串起来"
date: 2026-10-11 12:22:00
updated: 2026-10-11 12:22:00
permalink: course-cs336.html
categories: [课程]
tags: [CS336, LLM, 系统]
cover: /images/covers/cover-01.webp
description: 从 BPE、Transformer 到数据处理与对齐，整理 CS336 的实现主线，以及计算资源限制下没有完整复现的部分。
---

语言模型的名字见过不少，模块的名字也见过不少。BPE、RoPE、RMSNorm、GRPO...单独拿出来，好像都能说上几句。

但把它们放到同一个系统里，又是另外一回事。

CS336 的学习记录，主要就是沿着这条线走。仓库按五次 Assignment 保存实现、实验脚本和笔记，另外还有 Lecture 记录。这次先把它们接起来看一遍，不拿一次跑分当作整门课的总结。

## 从能写出模块，到理解模块怎样配合

A1 从 byte-level BPE 和 tokenizer 开始，继续实现 Linear、Embedding、RMSNorm、SwiGLU、RoPE 和注意力，再接上损失函数、AdamW、训练循环与生成脚本。单独认识这些名字并不够：token 如何变成张量、张量经过哪些维度变换、梯度在哪里产生，才是把模型真正接起来时需要面对的问题。

A2 把问题移到系统层。Profiler、混合精度、GPU 内存、Triton、DDP 和分片训练，让“模型能训练”进一步变成“训练时间和资源消耗来自哪里”。计算、通信、同步与显存占用需要一起考虑。

## 模型之外，数据与训练目标同样重要

A3 讨论模型规模、数据量和计算预算的关系；A4 处理文本提取、过滤和去重；A5 进入 RLVR、策略梯度、GRPO 及重要性重加权。它们让课程从网络结构扩展成一个完整的语言模型系统。

复习时，我更愿意沿着一个具体问题回看笔记：一个 token 怎样被编码、一个 batch 怎样被训练、一批 rollout 怎样变成更新信号。这样比较容易看出不同章节之间的连接。

## 完成范围

仓库 README 将 Spring 2026 主线标记为完成，但部分需要大规模 GPU / B200 资源的实验没有完整复现。能把主线接起来，和把所有规模实验跑完，不是同一件事。

限制就在这里，也没有必要把它藏起来。以后再回来看，至少能分清自己留下的是实现、理解，还是一项真正测过的结果。

## 公开来源

[学习仓库与完成范围](https://github.com/Okazaki-Yumemi/CS336) · [实现与实验](https://github.com/Okazaki-Yumemi/CS336/tree/main/assignments) · [学习笔记](https://github.com/Okazaki-Yumemi/CS336/tree/main/notes)
