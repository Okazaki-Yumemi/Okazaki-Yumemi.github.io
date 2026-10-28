---
title: "DesktopManager：桌面上的东西，能不能各归各位"
date: 2026-10-11 12:10:00
permalink: project-desktop-manager.html
categories: [项目]
tags: [工具开发]
cover: /images/covers/cover-07.webp
description: 从虚拟集合到任务、日历与专注，记录 DesktopManager 的结构和不挪动原文件的整理方式。
---

DesktopManager 是一个桌面整理工具。它使用虚拟集合把文件归类，保存的是文件与集合之间的关联，不需要为了分组就移动原文件。

## 项目结构

项目使用 Tauri 2、Rust、Svelte 5 / TypeScript 和 SQLite。界面通过统一入口调用 Tauri commands，再进入领域逻辑和存储层。SQL 放在存储模块，Windows 桌面相关行为放在专门的适配模块。

仓库还记录了桌面监听、布局快照、工作场景、任务、日历、专注计时和日历导出等功能。

## 文件和状态

桌面工具还得处理文件消失、数据库升级和布局恢复等情况。架构文档中记录了迁移备份和缺失文件标记；功能状态文档则区分了自动测试、浏览器检查和 Windows 窗口验收。各功能的具体状态可以直接看仓库里的记录。

## 相关链接

[项目仓库](https://github.com/Okazaki-Yumemi/desktopManager) · [架构](https://github.com/Okazaki-Yumemi/desktopManager/blob/main/docs/ARCHITECTURE.md) · [功能状态记录](https://github.com/Okazaki-Yumemi/desktopManager/blob/main/docs/STATE.md)
