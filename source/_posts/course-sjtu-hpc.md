---
title: "SJTU HPC 2026 学习记录：先把工具链和运行过程弄清楚"
date: 2026-10-11 12:14:00
updated: 2026-10-11 12:14:00
permalink: course-sjtu-hpc.html
categories: [课程]
tags: [系统与性能]
cover: /images/covers/cover-12.webp
description: 基于公开练习与笔记，整理 Shell、编译构建、语言工具和 GPU 代码之间的联系。
---

这里记录一下 SJTU HPC 2026 的学习和准备资料。仓库里有 Shell、C/C++、Makefile、CMake、CUDA 和 Python 构建测试脚本，笔记还涉及工具、网络、编译和语言。

## 编译过程

编译笔记把预处理、生成汇编、汇编成目标文件和链接分开记录。这样遇到问题时，可以先判断错误出现在哪一步：头文件和宏、语言本身的错误，以及链接时找不到符号，需要从不同地方排查。

练习既有单文件程序，也有多文件组织。项目大一点之后，编译选项、依赖关系和链接目标都需要构建文件帮忙管理。

## GPU 代码

`class06` 目录包含 C++、CUDA 和 Python 文件，可以对照着看主机端调用、设备端计算以及构建和测试脚本如何连接。

这些资料主要是学习和练习记录；要比较性能，还需要具体的硬件、输入和测量方式。

## 相关链接

[学习仓库](https://github.com/Okazaki-Yumemi/SJTUHPC2026) · [编译笔记](https://github.com/Okazaki-Yumemi/SJTUHPC2026/blob/main/Notes/05.Compiling.md) · [class06 练习](https://github.com/Okazaki-Yumemi/SJTUHPC2026/tree/main/Assignments/class06)
