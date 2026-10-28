---
title: "AI Infrastructure Seminars：从写 kernel 到解释性能"
date: 2026-10-11 12:21:00
updated: 2026-10-11 12:21:00
permalink: course-pku-ai-infra.html
categories: [课程]
tags: [人工智能, 系统与性能]
cover: /images/covers/cover-06.webp
description: 整理 CUDA、Triton、TileLang 与 Tensor Core 学习中的正确性、内存映射和测量方法。
---

这篇整理一下 LCPU / PKU AI Infrastructure Seminars 的学习记录。内容包括 CUDA、Triton、TileLang、GPU 内存层次、Tensor Core、流水线和推理。

## Kernel 和正确性

`assignment01/kernels/` 里有向量加法、softmax、矩阵乘法和 TileLang 相关文件。写 kernel 的时候，先要确认计算结果正确，再去考虑线程如何分配、数据怎样访问以及哪里值得优化。

合并访问、共享内存复用、寄存器占用和同步位置都会影响执行。一个优化到底有没有用，还是得结合瓶颈和测量结果来看。

## 性能测量

GPU 执行是异步的，计时之前需要考虑预热、同步和重复运行。JIT 编译时间也要和稳定执行时间区分开，不然测到的可能不是想比较的部分。

Tile size、warp 数量和共享内存用量也与硬件有关。`Notes/` 里另外记录了内存抽象、GEMM、Tensor Core 和流水线，代码和笔记可以一起对照着看。

## 相关链接

[课程仓库与测量边界](https://github.com/Okazaki-Yumemi/PKU-Ai-Infra) · [kernel 文件](https://github.com/Okazaki-Yumemi/PKU-Ai-Infra/tree/main/assignment01/kernels) · [学习笔记](https://github.com/Okazaki-Yumemi/PKU-Ai-Infra/tree/main/Notes)
