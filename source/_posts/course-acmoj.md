---
title: "ACMOJ 作业整理：接口约束与对象生命周期"
date: 2026-10-11 12:16:00
updated: 2026-10-11 12:16:00
permalink: course-acmoj.html
categories: [课程]
tags: [编程与算法]
cover: /images/covers/cover-09.webp
description: 从两组公开作业中整理受限接口下的逻辑构造，以及析构驱动的延迟执行。
---

这篇记录一下 ACMOJ 上的 C++ 作业。仓库按照 Homework 和题号保存代码，这里挑两道比较有意思的题。

## 逻辑构造

`Homework1/2354/ans.hpp` 里面先定义了一个函数：只有两个输入都为真时才返回假。再利用这个函数组合出逻辑与和逻辑非。

题目对可用操作有限制，所以不能只看最后的结果。需要想清楚在给定操作下，怎么把想要的逻辑组合出来。

## Defer 与对象生命周期

`Homework2/1048/DeferClass.hpp` 使用 `std::function<void()>` 保存动作，在对象析构时从容器尾部逐个取出执行。复制构造和复制赋值被禁用，避免一组动作被复制到另一个对象之后执行两遍。

这里需要注意保存顺序和执行顺序，也需要想清楚对象什么时候离开作用域。作业代码和题目接口可以在下面的仓库里查看。

## 相关链接

[作业仓库](https://github.com/Okazaki-Yumemi/ACMOJ-John-26Spring) · [逻辑构造](https://github.com/Okazaki-Yumemi/ACMOJ-John-26Spring/blob/main/Homework1/2354/ans.hpp) · [Defer 实现](https://github.com/Okazaki-Yumemi/ACMOJ-John-26Spring/blob/main/Homework2/1048/DeferClass.hpp)
