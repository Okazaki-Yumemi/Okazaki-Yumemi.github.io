---
title: "【暂时AIGC占位】ACMOJ 作业整理：接口约束与对象生命周期"
date: 2026-10-11 12:16:00
updated: 2026-10-11 12:16:00
permalink: course-acmoj.html
categories: [课程]
tags: [编程与算法]
cover: /images/covers/cover-09.webp
description: 从两组公开作业中整理受限接口下的逻辑构造，以及析构驱动的延迟执行。
---

有些题的麻烦，不是“不知道怎么写”，而是“知道的那个写法，这次不许用”。

另一些题，则把问题藏在对象什么时候结束生命里。

`ACMOJ-John-26Spring` 按 Homework 和题号保存 C++ 作业。这里选两个具体例子回看：一个是受限操作下的逻辑构造，一个是离开作用域时才执行的动作。只看代码能说明的部分，不根据题号猜成绩。

## 在约束中组合逻辑

`Homework1/2354/ans.hpp` 先定义了一个只有两个输入同时为真时才返回假的函数，再用它组合出逻辑与和逻辑非。题目注释对可用操作作了限制，因此重点不仅是结果正确，还包括实现是否遵守给定接口与操作集合。

这种练习有助于把逻辑表达式拆成更小的构造。一个熟悉的操作，在不允许直接使用时，需要重新解释它由哪些基本行为组成。

## 用生命周期组织清理动作

`Homework2/1048/DeferClass.hpp` 使用 `std::function<void()>` 保存动作，析构时从容器尾部逐个取出并执行。实现还禁用了复制构造与复制赋值，避免把同一组退出动作无意间复制给另一个对象。

它把“离开作用域时做什么”放进对象生命周期。这里值得理解的不只是一个析构函数，而是动作保存顺序、执行顺序，以及对象所有权之间的关系。

## 作业代码怎样成为复习材料

回看时，可以先写下题目的接口约束，再解释自己的实现为何满足这些约束。之后才讨论边界输入、复杂度和潜在的失败路径。这样比只保留最终答案更容易形成可以迁移到其他题目的理解。

本文不新增 OJ 通过率或成绩说法，也没有在这次博客整理中重新运行课程评测。

## 公开来源

[作业仓库](https://github.com/Okazaki-Yumemi/ACMOJ-John-26Spring) · [逻辑构造](https://github.com/Okazaki-Yumemi/ACMOJ-John-26Spring/blob/main/Homework1/2354/ans.hpp) · [Defer 实现](https://github.com/Okazaki-Yumemi/ACMOJ-John-26Spring/blob/main/Homework2/1048/DeferClass.hpp)
