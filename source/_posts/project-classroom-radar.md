---
title: "空教室雷达：别再一间一间开盲盒了"
date: 2026-10-11 12:06:00
permalink: project-classroom-radar.html
categories: [项目]
tags: [工具开发, Web开发]
cover: /images/covers/cover-03.webp
description: 从日期、楼栋和节次筛选空教室，重新整理查询逻辑，以及课表空闲与现场空闲的区别。
---

之前写过一篇[空教室查询器](/post-3.html)，这里再记一下查询逻辑。

## 怎么判断有没有课

项目使用 Flask。查询接口接收日期、楼栋和起止节次，遍历楼层和教室的课程安排，排除时间有交集的教室。

把查询节次记作闭区间 `[a, b]`，课程节次记作 `[c, d]`。两者不重叠的情况是 `b < c` 或 `a > d`；除此之外就存在重叠。这样包含、部分交叉和边界相接都可以用同一条规则处理。

## 课表和现场状态

当天的查询还会尝试补充现场占用信息和部分环境指标。课表反映的是排课安排，现场数据则是某个时刻的观测；没有排课并不一定代表教室里没有人。

学校接口的字段、权限和可用性可能变化，这次没有重新查询接口。使用时还是要以实际情况为准。

## 相关链接

[项目仓库](https://github.com/Okazaki-Yumemi/SJTU-empty-Classroom-Radar) · [查询代码](https://github.com/Okazaki-Yumemi/SJTU-empty-Classroom-Radar/blob/main/app.py)
