---
title: "水源会话锁：给再看一眼加一点阻力"
date: 2026-10-11 12:07:00
permalink: project-session-lock.html
categories: [项目]
tags: [工具开发]
cover: /images/covers/cover-05.webp
description: 一个在水源网页上设置会话时间的用户脚本，以及软约束能做什么、不能做什么。
---

水源会话锁是一个用户脚本，可以在浏览水源时设置会话时长。它运行在 Tampermonkey、Violentmonkey 等脚本管理器中，是个人工具。

脚本提供预设和自定义时长，保存会话状态，也避免在同一会话里重复弹出提示。设置之后有短暂的撤销窗口，另外还提供次数受限的强制解锁，方便处理临时需要使用水源的情况。

状态保存依赖脚本管理器的存储能力。这个工具主要是给自己一个提醒，并不能阻止主动停用脚本或通过其他入口访问。

项目地址放在下面。

## 相关链接

[项目与用户脚本](https://github.com/Okazaki-Yumemi/shuiyuan-session-lock)
