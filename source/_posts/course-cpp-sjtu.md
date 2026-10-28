---
title: "交大 C++ 基础课：从第一个程序开始建立习惯"
date: 2026-10-11 12:17:00
updated: 2026-10-11 12:17:00
permalink: course-cpp-sjtu.html
categories: [课程]
tags: [编程与算法]
cover: /images/covers/cover-04.webp
description: 基于公开课堂练习，整理输入输出、编译与小程序组织这些容易被略过的基础。
---

这里放一下交大 C++ 基础课的课堂代码。目前仓库里的内容主要是 Hello World、课堂练习和输入输出示例，先把这些基础部分记下来。

第一份 `main.cpp` 使用 `std::cout` 输出 Hello World，同目录下还有 Makefile。程序虽然很短，但从源文件到可执行程序，仍然要经过编译和运行的过程。后面遇到多文件项目，还需要考虑依赖和链接。

输入输出部分也有一个值得注意的地方：`cin.get.cpp` 虽然文件名里有 `get`，实际使用的是 `std::cin >> a >> b >> c`。两种输入方式对空白字符的处理不同，复习的时候还是得看代码本身。

目前这里是课堂练习的记录，后面有新的代码再继续补充。

## 相关链接

[课堂仓库](https://github.com/Okazaki-Yumemi/Cpp_SJTU) · [第一个程序](https://github.com/Okazaki-Yumemi/Cpp_SJTU/blob/main/01_cls_helloworld/main.cpp) · [输入输出示例](https://github.com/Okazaki-Yumemi/Cpp_SJTU/blob/main/03_cls_casual/cin.get.cpp)
