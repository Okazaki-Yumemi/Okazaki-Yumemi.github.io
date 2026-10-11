# YMGFC_CN's Blog

基于 [Hexo](https://hexo.io/zh-cn/) 8.1.2 和 [Butterfly](https://github.com/jerryc127/hexo-theme-butterfly) 5.7.0。

## 本地运行

需要 Node.js 20.19+，推荐 Node.js 24。

```sh
npm ci
npm run server
```

默认预览地址为 http://localhost:4000。

## 写作与配置

- 文章：`source/_posts/*.md`，通过 `npx hexo new "文章标题"` 新建。
- 独立页面：`source/about/`、`source/projects/` 等。
- 站点配置：`_config.yml`。
- 主题覆盖配置：`_config.butterfly.yml`，主题通过 npm 安装，不直接修改 `node_modules`。
- 原有图片、GIF、光标和音乐：`images/`；Hexo 生成器将它们复制到站点，原地址不变。
- 自定义样式和交互：`source/assets/`。
- 图标字体与图片缩放库：由 `scripts/static-assets.js` 从锁定的 npm 依赖生成并本地托管，许可证随构建输出保留。

旧文章的正文、发布日期与 `post-1.html`、`post-2.html`、`post-3.html` 地址已保留。公式在构建时渲染成 MathJax SVG，代码在构建时高亮，正文不依赖浏览器执行 Markdown 转换。

## 构建与发布

```sh
npm run clean
npm run publish:root
npm run check
git add .
git commit -m "更新博客"
git push origin main
```

`public/` 是忽略的临时构建目录。`publish:root` 将 `public-files.json` 中列出的站点输出同步至仓库根目录并创建 `.nojekyll`，兼容现有 GitHub Pages 的 **main / (root)** 发布方式。根目录的 HTML、`css/`、`js/`、`assets/` 等是生成文件，请编辑 `source/` 后重新构建。

GitHub Actions 会在推送 main 后安装锁定依赖、构建、检查，并保存 `hexo-site` 构建产物。GitHub Pages 按现有 main 根目录方式发布已提交的静态输出，因此每次更新文章后需运行 `npm run publish:root` 再提交。

网站地址：https://okazaki-yumemi.github.io/

音乐位于侧栏，通过原生播放器手动播放；跨页面恢复会受浏览器自动播放策略限制。移动端隐藏两侧 GIF 装饰，减少阅读遮挡；系统减少动态效果时关闭樱花及壁纸轮播。

依赖安装时 `npm audit` 报告 15 项上游问题（4 moderate、11 high）；`npm audit fix` 未能在当前兼容范围内消除。发布站点是静态文件，Node.js 依赖仅用于本地构建、预览和 CI，后续升级时应复核这些告警。
