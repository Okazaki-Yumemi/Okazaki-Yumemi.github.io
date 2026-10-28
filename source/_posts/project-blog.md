---
title: "给博客搬一次家：Hexo、Butterfly，以及没必要的折腾"
date: 2026-10-11 12:01:00
permalink: project-blog.html
categories: [项目]
tags: [博客建设, Web开发]
cover: /images/covers/cover-12.webp
description: 从手写 HTML 迁移到 Hexo 与 Butterfly，保留旧文章和旧地址，并把失去同步的壁纸轮播关掉。
---

之前搭博客的时候直接写 HTML，文章少的时候还能管得过来。页面和文章多起来之后，每加一点内容都要改好几个地方，于是这次把博客迁移到了 Hexo，主题使用 Butterfly。

## 旧文章和地址

原来的三篇文章迁移到了 Markdown，正文、代码和公式保留，`post-1.html` 到 `post-3.html` 也继续使用原来的地址。标签、分类、归档和搜索则交给生成器处理，以后加文章不用手动维护每个列表。

## 构建和发布

文章、配置和构建脚本作为源文件，页面、样式和搜索索引由构建生成，依赖版本记录在锁文件里。这次迁移时的发布方式仍然适配 GitHub Pages 的 `main` 分支根目录。

构建之后会检查本地链接、图片、搜索，以及旧文章中的代码和公式。博客后来又加了[在线写作入口](/note-20261015-a09fd9c5.html)，发布流程也有调整。

## 背景图

之前想做背景轮播，但是首页封面和正文背景没有同步，两张图各换各的，看起来不太对。最后把自动轮播去掉，页头和正文共用固定背景层。列表和推荐使用压缩过的封面，也不用每次加载原始大图。

总算可以少花一点时间调整壁纸，多写点东西了。

## 相关链接

[博客仓库](https://github.com/Okazaki-Yumemi/Okazaki-Yumemi.github.io) · [Hexo](https://hexo.io/zh-cn/) · [Butterfly](https://github.com/jerryc127/hexo-theme-butterfly)
