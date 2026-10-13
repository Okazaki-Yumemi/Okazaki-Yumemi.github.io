---
title: "【暂时AIGC占位】SJTU HPC 2026 学习记录：先把工具链和运行过程弄清楚"
date: 2026-10-11 12:14:00
updated: 2026-10-11 12:14:00
permalink: course-sjtu-hpc.html
categories: [课程]
tags: [HPC, C++, CUDA]
cover: /images/covers/cover-12.webp
description: 基于公开练习与笔记，整理 Shell、编译构建、语言工具和 GPU 代码之间的联系。
---

提起 HPC，很容易先想到 GPU、并行和各种性能数字。

但程序还没成功编译出来的时候，这些东西暂时都离得挺远。工具链不明白，连问题发生在哪一步都说不清楚。

`SJTUHPC2026` 保存了学习与准备中的 Shell 练习、C/C++ 程序、Makefile、CMake 示例、CUDA 文件和 Python 构建测试脚本，笔记则记录工具、网络、编译和语言。这次先从它们怎样接起来说起。

## 编译不是一个黑盒按钮

编译笔记把预处理、生成汇编、汇编成目标文件和链接拆开观察。这样做的价值，是能把不同类型的错误放回对应阶段：头文件和宏的问题、语言规则的问题，以及符号与库的问题，并不发生在同一个地方。

课程练习中同时出现单文件构建与多文件组织。随着程序拆成多个模块，编译参数、依赖关系和链接目标都需要显式管理，构建文件也因此成为项目的一部分。

## 从主机程序走向 GPU

公开的 class06 目录包含 C++、CUDA 与 Python 文件。这提供了一个观察接口的入口：主机端如何组织调用，设备端怎样实现计算，测试脚本怎样把构建与检查串起来。

这份总结不会只凭文件扩展名就推断已经实现某个高性能算法，也不会把学习准备仓库写成比赛成绩记录。性能结果需要对应的输入、硬件、测量方法与可重复实验支持。

## 复习的顺序

先能解释程序怎样构建和运行，再看语言与库如何连接，最后讨论并行执行和性能。工具链知识看起来基础，却能帮助区分“算错了”“编译错了”和“测量方式不对”这几类完全不同的问题。

## 公开来源

[学习仓库](https://github.com/Okazaki-Yumemi/SJTUHPC2026) · [编译笔记](https://github.com/Okazaki-Yumemi/SJTUHPC2026/blob/main/Notes/05.Compiling.md) · [class06 练习](https://github.com/Okazaki-Yumemi/SJTUHPC2026/tree/main/Assignments/class06)
