---
title: "【暂时AIGC占位】交大 C++ 基础课：从第一个程序开始建立习惯"
date: 2026-10-11 12:17:00
updated: 2026-10-11 12:17:00
permalink: course-cpp-sjtu.html
categories: [课程]
tags: [编程与算法]
cover: /images/covers/cover-04.webp
description: 基于公开课堂练习，整理输入输出、编译与小程序组织这些容易被略过的基础。
---

Hello World 很短，但它也得先被编译出来，才会出现在屏幕上。

学到后面，基础很容易被当成已经会了的东西。可真出了问题，还是要回来检查输入、类型、编译和链接。

`Cpp_SJTU` 目前留下的公开课堂记录不多，主要是 Hello World、课堂练习和输入输出示例。这篇就从这些小程序写起，不把它扩成一个实际上还没有留下来的完整课程总结。

## 小程序也有完整的执行链

第一份 `main.cpp` 使用 `std::cout` 输出 Hello World，同目录还有 Makefile。即使程序只有几行，它也需要经过源文件、编译、生成可执行程序和运行这一条链路。理解这些环节，可以减少以后遇到构建问题时的混淆。

输入输出练习则提醒我注意接口语义。公开的 `cin.get.cpp` 文件虽然名字包含 `get`，实际代码使用的是 `std::cin >> a >> b >> c`，不能仅凭文件名就说它演示了 `cin.get()`。阅读代码时，具体表达式比名称更可靠。

## 从示例中提炼可复用的检查

对于一个小程序，可以依次确认输入假设、类型选择、输出格式和退出行为。随着练习增加，这些问题不会消失，只会被更复杂的算法包裹起来。

把课堂示例单独保存，也便于以后比较不同写法：某个输入操作是否跳过空白，一个值的作用域在哪里，编译选项会怎样改变诊断信息。这样的基础值得慢慢积累。

## 当前记录范围

这是一篇入门阶段的整理。公开仓库不足以支持“全部课程章节已完成”或某个成绩结论，因此这里不作这些延伸；后续课程代码增加后，可以继续补充具体主题。

## 公开来源

[课堂仓库](https://github.com/Okazaki-Yumemi/Cpp_SJTU) · [第一个程序](https://github.com/Okazaki-Yumemi/Cpp_SJTU/blob/main/01_cls_helloworld/main.cpp) · [输入输出示例](https://github.com/Okazaki-Yumemi/Cpp_SJTU/blob/main/03_cls_casual/cin.get.cpp)
