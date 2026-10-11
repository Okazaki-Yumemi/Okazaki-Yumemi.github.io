---
title: "AI Infrastructure Seminars：从写 kernel 到解释性能"
date: 2026-10-11 12:21:00
updated: 2026-10-11 12:21:00
permalink: course-pku-ai-infra.html
categories: [课程]
tags: [GPU, CUDA, Triton]
cover: /images/covers/cover-06.webp
description: 整理 CUDA、Triton、TileLang 与 Tensor Core 学习中的正确性、内存映射和测量方法。
---

写出一个 kernel，和写出一个快的 kernel，中间隔着挺多事情。

更麻烦的是，那个“快”还得是真的快，不能只是计时的时候少等了一会。

`PKU-Ai-Infra` 记录了 LCPU / PKU AI Infrastructure Seminars 的学习过程，涉及 CUDA、Triton、TileLang、GPU 内存层次、Tensor Core、流水线与推理。课程资料和个人实现的来源关系，仓库里也作了区分。

## 正确性先行的优化流程

仓库给出的学习流程很明确：理解计算、建立参考实现、检查正确性，再分析线程与内存映射，最后测量和优化。`assignment01/kernels/` 中可以看到向量加法、softmax、矩阵乘法以及 TileLang 相关文件；对应测试目录把计算结果与实现细节分开组织。

对于 kernel，不能只看代码行数。数据是否合并访问、共享内存是否复用、寄存器使用是否挤压并行度，以及同步发生在什么位置，都会影响最终执行方式。优化时需要先解释瓶颈，再判断修改是否针对这个瓶颈。

## 测量也是实现的一部分

GPU 执行是异步的。仓库 README 特别讨论了预热、同步、重复运行、测量波动，以及 JIT 编译时间和稳定执行时间的区别。一次“看起来很快”的测量，未必在测量真正想比较的东西。

同样，tile size、warp 数量和共享内存使用量都与硬件有关。这里不把本地调出的参数写成通用最优参数，也不把不同设备上的数据直接并列为性能提升。

## 这份记录的价值

课程代码之外，`Notes/` 保存了内存抽象、GEMM、Tensor Core 和流水线等主题的整理。回看时，可以把一个实现与一份解释放在一起：它算得对吗？资源如何流动？测量是否支持结论？这三个问题比单独记住某个 API 更适合作为复习入口。

## 公开来源

[课程仓库与测量边界](https://github.com/Okazaki-Yumemi/PKU-Ai-Infra) · [kernel 文件](https://github.com/Okazaki-Yumemi/PKU-Ai-Infra/tree/main/assignment01/kernels) · [学习笔记](https://github.com/Okazaki-Yumemi/PKU-Ai-Infra/tree/main/Notes)
