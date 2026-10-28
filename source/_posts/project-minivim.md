---
title: "MiniVim：原来光标后面有这么多事情"
date: 2026-10-11 12:12:00
permalink: project-minivim.html
categories: [项目]
tags: [工具开发, 编程与算法]
cover: /images/covers/cover-04.webp
description: 从文本缓冲区、模式切换到终端渲染，记录 MiniVim 里一个按键怎样变成一次编辑。
---

MiniVim 是基于交大 CS1958-01 课程框架的 C++17 编辑器项目。我的仓库是课程上游的 fork，下面记录一下项目中的模块和编辑流程。

## 模块

项目分为 `Buffer`、`Window`、`Command`、`Renderer`、`Editor` 和 `Terminal`，分别处理文本、可见区域、命令、渲染、编辑器状态和终端交互。

屏幕上的行号不一定等于文件中的行号；缓冲区修改之后，也需要由渲染部分把变化显示出来。看源码时可以从按键进入 `Editor` 开始，继续跟到作用于 `Buffer` 的操作。

## 模式和边界

Normal、Insert 和命令行模式下，相同按键可能有不同含义。除此之外，行首退格、光标移动到屏幕外等情况也需要明确处理。

课程提供基础要求、进阶说明和终端测试工具。这篇主要记录结构，没有重新运行完整课程测试。

## 相关链接

[项目仓库](https://github.com/Okazaki-Yumemi/MiniVim) · [课程框架](https://github.com/SJTUJohnClass/MiniVim) · [源码](https://github.com/Okazaki-Yumemi/MiniVim/tree/main/src)
