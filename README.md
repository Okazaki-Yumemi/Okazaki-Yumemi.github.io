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
- 图片、GIF、光标和音乐：`images/`；只有 `public-images.json` 明确列出的素材才会生成到站点。新增原图在本地保留，文章使用 `images/covers/` 中去除元数据、压缩后的 WebP 副本。
- 自定义样式和交互：`source/assets/`。
- 图标字体与图片缩放库：由 `scripts/static-assets.js` 从锁定的 npm 依赖生成并本地托管，许可证随构建输出保留。

旧文章的正文、发布日期与 `post-1.html`、`post-2.html`、`post-3.html` 地址已保留。公式在构建时渲染成 MathJax SVG，代码在构建时高亮，正文不依赖浏览器执行 Markdown 转换。

## 构建与发布

### 网页写作

从导航中的“写作”进入 Cloudflare 写作后台，GitHub 登录后可新建或编辑文章、实时预览 Markdown、选择或上传封面，并直接发布。只允许作者账号，GitHub App 只安装在本博客仓库。草稿保存在当前浏览器，发布才会写入公开仓库。部署与权限细节见 [writer/README.md](writer/README.md)。

网页发布使用 GitHub Actions 自动生成和部署，不需要本地生成 HTML 或手工 push。以下命令保留为本地维护入口。

```sh
npm run clean
npm run publish:root
npm run check
```

提交前逐项核对 `git status` 与暂存内容，不使用不加区分的 `git add .`：本地图片原件和未授权资料不应提交。文章需要核稿时，仅运行 `npm run build` 与 `npm run check` 生成本地预览；核稿通过后再同步根目录、commit 和 push。

`public/` 是忽略的临时构建目录。`publish:root` 将构建产物（图片保留在原目录）及 `public-files.json` 中列出的站点输出同步至仓库根目录并创建 `.nojekyll`，兼容现有 GitHub Pages 的 **main / (root)** 发布方式。根目录的 HTML、`css/`、`js/`、`assets/` 等是生成文件，请编辑 `source/` 后重新构建。

## 公开资料边界

2026-10-11 新增的课程与项目文章只取材于无需登录即可访问的 GitHub 公开仓库；文章结尾列出公开来源。`public-sources.json` 列出核实过的公开仓库名，构建检查会拒绝文章中指向其他本人仓库的链接。这个检查不能替代写作时的内容核对；私有仓库、账号配置、真实票码和个人识别信息不得作为文章素材。

三篇文学随笔另以作者明确指定的三份原稿为材料，不上传原稿文件或全文。未定名 PDF 为多人署名接力稿，随笔主要讨论署名 YMG 的第四章，不将整部作品归为个人独作。

GitHub Actions 会在推送 main 后安装锁定依赖、测试写作后台、构建并检查博客，同时保存 `hexo-site` 构建产物。启用仓库 variable `WEB_WRITER_ENABLED=true` 后，Pages 发布源使用 GitHub Actions，工作流直接部署 `public/`，网页写作只需提交源文件。`publish:root` 保留用于同步根目录的历史静态副本，不再是上线所必需的步骤。

网站地址：https://okazaki-yumemi.github.io/

音乐位于侧栏，通过原生播放器手动播放；跨页面恢复会受浏览器自动播放策略限制。所有页面的页头透明，统一透出同一个固定壁纸层，不再把文章封面用作独立页头背景，也不自动轮播。文章封面仍用于列表与推荐。移动端隐藏两侧 GIF 装饰，减少阅读遮挡；系统减少动态效果时关闭樱花。

依赖安装时 `npm audit` 报告 15 项上游问题（4 moderate、11 high）；`npm audit fix` 未能在当前兼容范围内消除。发布站点是静态文件，Node.js 依赖仅用于本地构建、预览和 CI，后续升级时应复核这些告警。
