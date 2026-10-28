---
title: "STLite 数据结构作业：把容器接口落到内存与迭代器"
date: 2026-10-11 12:15:00
updated: 2026-10-11 12:15:00
permalink: course-stlite.html
categories: [课程]
tags: [编程与算法]
cover: /images/covers/cover-11.webp
description: 整理 vector、deque、priority_queue 与 map 的课程项目，以及分块存储和对象生命周期的实现思考。
---

STLite 是 ACM 班 CS1951 数据结构课的作业框架，要求实现 `vector`、`deque`、`priority_queue` 和 `map`，包括迭代器和复杂度要求。我的仓库是课程仓库的 fork，接口和测试来自上游。

## deque 的存储

`deque/notes.md` 里记录了分块数组的设计：通过逻辑下标找到块号和块内偏移，再用这套坐标处理访问、迭代和元素移动。

实现容器的时候，接口写出来只是第一步。插入、删除和扩容之后，元素位置以及迭代器的行为都需要重新考虑。

## 内存和对象

笔记还讨论了元素没有默认构造函数的情况。块申请原始内存，容器在需要的位置构造元素；删除、清空和析构时则要销毁活对象。异常路径上也需要处理已经构造的部分。

笔记中还留了坐标用错、扩容后容量没有更新、边界遗漏等排查记录。具体实现和课程要求可以在仓库里查看。

## 相关链接

[课程 fork](https://github.com/Okazaki-Yumemi/STLite-ACM-2026) · [课程上游](https://github.com/ACMClassCourse-2025/STLite-ACM-2026) · [deque 实现笔记](https://github.com/Okazaki-Yumemi/STLite-ACM-2026/blob/main/deque/notes.md)
