---
title: "第一篇博客:源(代码)神 启动！"
date: 2026-03-08 00:00:00
updated: 2026-03-08 00:00:00
slug: post-1
permalink: post-1.html
categories:
  - 技术
tags:
  - 博客建设
  - 编程与算法
cover: /images/bg1.png
mathjax: true
---

卷了一整个周末，有些无聊，又不想无所事事，所以这个blog就诞生了。作为一个 Markdown 迷和 LaTeX 享受者，怎么能容忍纯文本呢？

### 1. 物理与数学的交织 (LaTeX Test)
在无聊的时候，看看优美的公式也是一种放松（真的吗）。比如经典的薛定谔方程：
$$i\hbar\frac{\partial}{\partial t} \Psi(\mathbf{r},t) = \left [ -\frac{\hbar^2}{2m}\nabla^2 + V(\mathbf{r},t) \right ] \Psi(\mathbf{r},t)$$
当然，还有内联公式 $e^{i\pi} + 1 = 0$，这是数学中最纯粹的美。

### 2. 万物皆对象 (Code Test)
最近刚好在梳理 C++ 的函数封装，顺手写一段优雅的 OOP 示例：

~~~cpp
#include <iostream>
#include <string>

class Yumemi {
private:
    std::string title;
    int magicPower;

public:
    // 构造函数
    Yumemi(std::string t, int p) : title(t), magicPower(p) {}

    // 完美封装的方法
    void castSpell() {
        std::cout << title << ": Science and Magic, perfectly encapsulated!" << std::endl;
    }
};

int main() {
    Yumemi professor("Prof. Okazaki", 9999);
    professor.castSpell();
    return 0;
}
~~~
水源社区过于公开，日记过于私密，所以平时的一些想法就放在这里了吧。

以后就在这里记录更多的 Bug、Feature 还有各种天马行空的灵感吧！
