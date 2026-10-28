---
title: "WebsiteSpeedRun：把视频速度调到自己想要的位置"
date: 2026-10-11 12:04:00
permalink: project-video-speed.html
categories: [项目]
tags: [工具开发]
cover: /images/covers/cover-09.webp
description: 一个 Manifest V3 视频速度扩展，以及弹窗、页面执行与浏览器存储之间的连接。
---

WebsiteSpeedRun 是一个浏览器扩展，用来调整网页视频的播放速度。平台提供的速度档位有时不太合适，这个小工具提供了更多选择。

## 实现方式

扩展使用 Manifest V3。弹窗读取和保存速度设置，`chrome.storage.local` 保存设置；之后通过浏览器的脚本执行能力，在页面中操作 `video` 元素，并尝试处理 frame 中的媒体。

## 使用限制

不同网站的播放器实现不同，有些页面会重置播放速度，也有视频是在脚本执行后才动态加入的。当前代码主要处理执行时已经存在的元素，没有持续观察新增视频，因此不能保证所有网站都能持续生效。页面结构、浏览器权限和 iframe 限制也可能影响结果。

扩展代码见下面的仓库。

## 相关链接

[项目仓库](https://github.com/Okazaki-Yumemi/WebsiteSpeedRun) · [扩展脚本](https://github.com/Okazaki-Yumemi/WebsiteSpeedRun/blob/main/popup.js)
