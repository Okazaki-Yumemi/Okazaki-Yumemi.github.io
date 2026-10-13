---
title: "【暂时AIGC占位】李宏毅机器学习 2023：把模型、训练和实验放在一起"
date: 2026-10-11 12:20:00
updated: 2026-10-11 12:20:00
permalink: course-hungyi-ml.html
categories: [课程]
tags: [机器学习, PyTorch]
cover: /images/covers/cover-02.webp
description: 从回归与分类到 Transformer、强化学习和网络压缩，整理公开笔记与作业的复习路线。
---

模型的名字越来越多，但有些问题一直没变。数据从哪里来，想让它学会什么，最后又是拿什么判断它学会了。

李宏毅 Machine Learning 2023 Spring 的这份学习记录，把讲义笔记与作业 Notebook 分开保存。仓库里也记下了一条路线：先把机器学习基础接起来，再继续 CS336，数学与概率知识按需要补充。

与其急着记下更多名字，不如先看看这些不同的作业，究竟在解决什么不同的问题。

## 基础问题会反复出现

前面的笔记涉及 PyTorch、机器学习的基本思想，以及网络无法正常训练时的排查。回归和分类看起来简单，但数据怎样划分、损失怎样定义、模型是否学到了可泛化的规律，后面学习更复杂模型时仍然绕不开。

公开目录中，作业进一步覆盖 CNN、Self-Attention、Transformer、BERT、Autoencoder、可解释模型、对抗攻击、领域适应、强化学习与网络压缩。这里按目录整理主题，不把 Notebook 的存在等同于每项作业都达到了某个评分门槛。

## 怎样回看这些作业

一个比较有用的复习方式，是把每份作业拆成三个问题：输入和监督信号是什么，模型引入了什么结构假设，评估结果到底在衡量什么。换了模型之后，这三个问题仍然成立。

例如，Self-Attention 与 CNN 使用不同的组织方式；领域适应强调训练分布和目标分布之间的变化；压缩关注资源约束。把这些问题并列起来，比只按模型名字记忆，更容易理解为什么要选择不同方法。

## 保留实验的边界

仓库包含预测或提交文件，但本文没有重新运行训练，也不据此声称取得某个排行榜成绩。它是一份学习内容索引与复习总结，具体实现和笔记仍以公开仓库为准。

## 公开来源

[学习路线](https://github.com/Okazaki-Yumemi/HungYi_Lee_ML_2023_spring) · [讲义笔记](https://github.com/Okazaki-Yumemi/HungYi_Lee_ML_2023_spring/tree/main/notes) · [作业记录](https://github.com/Okazaki-Yumemi/HungYi_Lee_ML_2023_spring/tree/main/homework)
