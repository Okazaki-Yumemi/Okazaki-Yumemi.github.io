---
title: "STLite 数据结构作业：把容器接口落到内存与迭代器"
date: 2026-10-11 12:15:00
updated: 2026-10-11 12:15:00
permalink: course-stlite.html
categories: [课程]
tags: [C++, 数据结构, STLite]
cover: /images/covers/cover-11.webp
description: 整理 vector、deque、priority_queue 与 map 的课程项目，以及分块存储和对象生命周期的实现思考。
---

用 `vector` 的时候，`push_back` 就是一行。自己去实现的时候，这一行会突然长出一大堆前提。

还有空间吗？对象构造了吗？抛异常之后，已经做了一半的事情怎么算？

STLite 是 ACM 班 CS1951 数据结构课程的作业框架，要求实现 `vector`、`deque`、`priority_queue` 和 `map`，还包括迭代器行为与复杂度要求。我的仓库是课程仓库的 fork，教学接口和测试来自上游，个人实现与笔记则另看。

## 接口背后是具体的数据组织

容器名字很熟悉，但真正实现时，随机访问、插入、删除和迭代器都依赖底层结构。一个接口看起来简单，不代表它在所有存储方式下都能满足要求。

`deque/notes.md` 记录了一个具体选择：使用分块数组和逻辑下标，把元素位置映射到块号与块内偏移。这样可以把访问、迭代和移动操作放在同一套坐标体系下考虑。

## 分配内存与构造对象是两件事

笔记还讨论了不要求元素具有默认构造函数的情况。块负责申请原始内存，容器负责在需要的位置构造元素，并在删除、清空或析构时销毁活对象。把这些职责混在一起，容易造成额外构造、遗漏析构或异常路径上的资源问题。

迭代器同样需要明确归属和合法范围。`begin()`、`end()`、解引用及偏移操作都涉及边界，不能只用几个普通下标样例判断实现是否可靠。

## 需要保留下来的学习记录

笔记里留着坐标用错、扩容后容量没更新、边界漏掉这些排查过程。看起来不怎么体面，但回头找同一类问题时，比一句“终于写完了”有用得多。

这篇整理的是实现思路，不替代课程 OJ 和 code review，也没有重新跑全部测试。容器接口会不会用，和容器内部能不能一直守住自己的约定，还真不是同一件事。

## 公开来源

[课程 fork](https://github.com/Okazaki-Yumemi/STLite-ACM-2026) · [课程上游](https://github.com/ACMClassCourse-2025/STLite-ACM-2026) · [deque 实现笔记](https://github.com/Okazaki-Yumemi/STLite-ACM-2026/blob/main/deque/notes.md)
