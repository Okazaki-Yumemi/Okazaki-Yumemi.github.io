---
title: "CS61A 学习记录：从函数走向对象与状态"
date: 2026-10-11 12:18:00
updated: 2026-10-11 12:18:00
permalink: course-cs61a.html
categories: [课程]
tags: [编程与算法]
cover: /images/covers/cover-05.webp
description: 从 Discussion、Lab 和 Homework 中整理函数思考、对象封装与状态变化的学习重点。
---

之前在随笔里提过 Recursion、OOP。这些内容在 CS61A 里都能碰到，仓库按照学习日保存了 Discussion、Lab、Homework，也有 Cats 项目的文件。

## 对象和状态

`Day11/lab06/lab06.py` 里有银行账户练习。存款和取款要修改余额，也要记录交易前后的状态，后面才能从历史记录中看出发生了什么。

`Day12/hw06/hw06.py` 里的自动售货机则要处理库存、余额和商品价格。缺货、钱不够、购买和找零分别对应不同的情况，写的时候需要把这些状态变化理清楚。

作业的 docstring 里有调用和预期输出。看代码之前可以先按例子推一下：补货之后库存是多少，投币之后余额是多少，购买之后又会发生什么。

仓库中同时有题目模板、测试和个人代码，具体进度可以直接查看对应目录。

## 相关链接

[学习仓库](https://github.com/Okazaki-Yumemi/my_cs61a_study_codes) · [账户与交易练习](https://github.com/Okazaki-Yumemi/my_cs61a_study_codes/blob/main/Day11/lab06/lab06.py) · [售货机练习](https://github.com/Okazaki-Yumemi/my_cs61a_study_codes/blob/main/Day12/hw06/hw06.py)
