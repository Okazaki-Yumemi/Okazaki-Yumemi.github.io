---
title: "【暂时AIGC占位】人工智能基础与实践：从 Python 练习到可演示的作品"
date: 2026-10-11 12:19:00
updated: 2026-10-11 12:19:00
permalink: course-sjtu-ai.html
categories: [课程]
tags: [人工智能, SJTU, 学习笔记]
cover: /images/covers/cover-03.webp
description: 整理人工智能入门课程的实验、期末复习资料与反诈互动网页项目。
---

人工智能这个词太大了。大到听过很多介绍之后，还是很难说清楚自己究竟学了什么。

所以我更愿意从一份练习、一个实验和最后能打开的作品说起。这份交大人工智能入门课程仓库，保存了按周组织的实践、期末复习、自测页面和期末项目，内容从 Python 基础延伸到神经网络、CNN、目标检测、大语言模型、生成式 AI、Agent 与 AI 伦理。

## 把概念接到实际任务上

公开文件中可以看到回归与 MNIST 相关 Notebook，以及后续 CNN 实验。学习这些内容时，模型结构只是其中一部分：输入张量、标签、损失、训练循环和结果分析共同构成一个实验。

`Final_term_review/` 以章节整理概念，`Final_exercises/` 保存复习笔记和 HTML 自测页面。两者适合配合使用：先解释一个概念，再用问题检查自己是否真的能区分相近的说法。

## 从实验转向交付

期末项目《别点那个链接！》把校园反诈场景做成互动网页，包含三关剧情、风险线索复盘、AI 问答和报告导出。它既有可直接打开的静态演示模式，也有通过本地 Flask 后端连接模型接口的模式。

这让“调用一个模型”之外的工程问题也变得具体：接口失败怎么办，离线展示是否完整，用户选择怎样保存，输出依据怎样呈现。项目另有[独立记录](/project-anti-fraud.html)，这里主要整理课程的整体连接。

## 复习时保留两种视角

一边沿着模型和方法复习，另一边沿着完整实验复习：数据进入、模型计算、训练与评估、交互与输出。

概念不应该只留在期末的复习页上。能把它接到一个具体的小作品里，至少下次提起的时候，不会只剩下一个名字。这份记录只整理公开的课程内容，不放入成绩表和个人提交资料。

## 公开来源

[课程仓库](https://github.com/Okazaki-Yumemi/ShangHaiJiaoTongUniversity-Basic-introduction-to-Artificial-Intelligence-) · [期末复习笔记](https://github.com/Okazaki-Yumemi/ShangHaiJiaoTongUniversity-Basic-introduction-to-Artificial-Intelligence-/tree/main/Final_term_review) · [期末项目](https://github.com/Okazaki-Yumemi/ShangHaiJiaoTongUniversity-Basic-introduction-to-Artificial-Intelligence-/tree/main/Final_Big_Homework)
