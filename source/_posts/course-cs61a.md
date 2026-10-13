---
title: "【暂时AIGC占位】CS61A 学习记录：从函数走向对象与状态"
date: 2026-10-11 12:18:00
updated: 2026-10-11 12:18:00
permalink: course-cs61a.html
categories: [课程]
tags: [CS61A, Python, OOP]
cover: /images/covers/cover-05.webp
description: 从 Discussion、Lab 和 Homework 中整理函数思考、对象封装与状态变化的学习重点。
---

在之前的随笔里，我提过 Recursion、OOP 这些东西。它们让我觉得，程序不只是把一串指令顺着写完。

CS61A 的练习也是这样。一个银行账户，一台售货机，看起来很普通，却能把对象和状态的问题一点一点摆到面前。

`my_cs61a_study_codes` 按学习日保存 Discussion、Lab 和 Homework，也有 Cats 项目的文件。这是过程记录，不代表整门课程所有部分都已完成。

## 一个对象不只是几项属性

`Day11/lab06/lab06.py` 中的银行账户练习，把余额变化与交易历史联系起来。存款和取款不仅要计算一个新余额，还要记录前后状态，让后续报告能够解释发生了什么。

`Day12/hw06/hw06.py` 中的自动售货机练习，则把库存、余额和商品价格放进同一个对象。缺货、金额不足、找零与正常购买都是不同的状态分支。代码需要把这些情况组织成稳定的接口，而不是依靠调用者猜测内部数据。

## 例子本身也是规格

这些作业的 docstring 中包含大量调用与预期输出。它们把“应该怎样工作”变成具体序列：先补货、再投币、最后购买，每一步都会影响下一步。理解这样的例子，有助于把测试当作行为描述，而不只是提交前的检查按钮。

函数与对象也可以放在同一个视角下理解：函数描述一次计算，对象维护多次操作之间的关系。随着程序变复杂，需要认真判断哪些状态应当留下，哪些值只是当前计算的中间结果。

## 回看方式

回看的时候，先别急着找最终答案。把几次操作之后的状态自己推一遍，再看代码，往往更能发现理解在哪里断了。

这次没有重新运行课程评测。仓库里的个人实现、原题模板与测试文件，也仍然是三种不同的东西，不能混在一起当作完成证明。

## 公开来源

[学习仓库](https://github.com/Okazaki-Yumemi/my_cs61a_study_codes) · [账户与交易练习](https://github.com/Okazaki-Yumemi/my_cs61a_study_codes/blob/main/Day11/lab06/lab06.py) · [售货机练习](https://github.com/Okazaki-Yumemi/my_cs61a_study_codes/blob/main/Day12/hw06/hw06.py)
