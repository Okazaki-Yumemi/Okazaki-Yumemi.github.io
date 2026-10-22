# 网页写作后台

博客入口：`/write/`。独立后台运行在 Cloudflare Worker；GitHub Pages 只负责发布生成的网站。

## 日常使用

1. 从博客导航进入“写作”，使用 GitHub 登录。
2. 新建文章，填写标题和 Markdown；网址标识自动生成，可修改。分类、标签、摘要可选；也可从左侧加载已有文章。
3. 从已发布图片中选封面，或上传 JPEG / PNG / WebP。浏览器将上传图重新编码为最长 1600×1000 的 WebP，去除原图元数据；服务端限制转换后大小不超过 2 MB。
4. 点击发布并确认。正文、封面及图片白名单在同一个 Git commit 中写入 `main`，GitHub Actions 随后生成并部署网站。
5. 状态栏可以打开构建进度。提交成功不代表部署立即完成；构建失败时提交仍在仓库，可查看日志修正。

草稿仅保存在当前浏览器的 localStorage，不会自动上传到 GitHub。共享设备应清理浏览器站点数据。可用下载按钮导出 Markdown；新上传但尚未发布的封面不包含在 Markdown 文件中。切换文章前可恢复的本机草稿当前只有一份，新编辑会替换它。

编辑旧文保留原始日期、网址和额外 YAML 属性。正文与元数据会更新；程序用 blob SHA 和非强制分支更新拒绝覆盖别处的新改动。发生冲突时先导出草稿，再加载仓库版本合并。

## 权限边界

- GitHub App 只安装到 `Okazaki-Yumemi/Okazaki-Yumemi.github.io`，不选择 All repositories，也不安装到私有仓库。
- 仓库权限只有 Contents 读写、Actions 只读和自动提供的 Metadata 只读；不申请组织、账号、工作流写入或私有仓库相关权限。
- 服务端硬编码仓库、分支及作者 GitHub 数字 ID `259598129`。所有仓库操作前再次核实它仍为指定作者的公开仓库，不能从请求中指定其他仓库或文件目录。
- GitHub 授权使用 PKCE S256、随机 state、加密的临时 HttpOnly Cookie，并将用户 token 进一步限制到博客 repository ID。用户 ID 与登录名都需符合白名单。
- 用户 token 只保存在 AES-GCM 加密的 HttpOnly / Secure / SameSite=Lax Cookie 中，最长两小时。不返回浏览器 JavaScript、不写入 localStorage、不记录日志。会话密钥及 GitHub client secret 只在 Cloudflare Secrets。
- 发布请求同时校验 Origin 与 CSRF token。匿名用户即使加载编辑器，也无法读取后台接口或提交。
- API 只写 `source/_posts/*.md`、随机命名的 `images/covers/upload-*.webp` 和 `public-images.json`；拒绝路径穿越、SVG、非白名单已有封面及保留网址。
- 引用本人其他 GitHub 仓库时，仍需先核对并加入 `public-sources.json`。后台不访问这些仓库；未列入公开来源白名单的链接会在提交前拒绝，避免等到构建时才报错。
- 预览禁用原始 HTML 和危险链接，并有 CSP。发布到博客的 Markdown 仍遵循 Hexo 的原有规则，可信作者可以写 HTML；因此不要盲目发布来历不明的 Markdown。
- 注销清除当前浏览器 Cookie。无服务端会话数据库，已经被复制的旧 Cookie 在过期前不会因注销自动吊销；可在 GitHub 撤销 App 授权，或轮换 SESSION_SECRET 使所有会话失效。

## 构建与部署

测试使用 Node.js 24（与 GitHub Actions 一致），访问统计测试通过内置 SQLite 执行真实 SQL。

```sh
npm ci
npm run writer:test
npm run writer:build
npm run writer:deploy
```

配置文件 `writer/wrangler.jsonc` 中的 `PUBLIC_ORIGIN` 必须等于 Worker 的公开 HTTPS origin；`GITHUB_CLIENT_ID` 是公开配置，不是密钥。`writer-site.json` 记录博客入口指向的后台地址。构建产物 `.writer-build/` 不提交。

GitHub Pages 发布源应为 GitHub Actions，仓库 Actions variable `WEB_WRITER_ENABLED` 为 `true`。`.github/workflows/blog.yml` 先检查并生成 Hexo，再使用官方 Pages artifact / deployment actions 部署，不再依赖提交根目录 HTML。根目录历史生成文件保留兼容，本地仍可运行 `npm run publish:root`，但网页写作不需要它。

### 评论与访问统计

文章底部点击“加载评论”才会连接 Giscus；评论保存在此公开博客仓库的 Discussions。`site-features.json` 保存公开的仓库 / 分类 ID，`giscus.json` 只允许正式博客域名嵌入。Giscus App 仅安装到此仓库，不需要扩大写作 App 的权限。

写作后台顶部的“访客统计”进入 `/stats.html`，沿用作者的 GitHub 登录。匿名用户只能取得全站与单页累计数量，不能读取趋势、来源、国家 / 地区或最近访问。访客估计不代表真实人数，也不推断身份。

Cloudflare D1 绑定 `TRAFFIC_DB`，初始化或重建数据库时执行：

```sh
npx wrangler d1 execute hidden-space-traffic --remote --file writer/traffic.sql
```

数据库名称 / ID、每分钟限流绑定及每日清理 cron 在 `writer/wrangler.jsonc`。上线前必须先初始化表；Hexo 生成的 `traffic-pages.json` 是允许记录的固定公开页面清单，未发布页面拒绝写入。半小时区间通过原子事务去重，常见爬虫、DNT / GPC 和主动关闭统计的访问不记录。没有反作弊保证，仍可能有爬虫漏判或人为刷量。

不存原始 IP、完整 User-Agent / 来源 URL。IP 仅在请求内参与按日变化的 HMAC 去标识化计算；不同网络或浏览器可能重复计算，同网同类浏览器可能合并。原始 IP 仍可能由托管平台按其政策处理。近期记录保留 30 天，按日统计与去标识化标识保留 90 天，cron 每天清理一次；无访客标识的累计计数长期保留。隐私说明位于 `/privacy/`，页脚可关闭统计。不使用前端持久访客 ID。

### 首次连接 GitHub App

先用 `npx wrangler login` 登录 Cloudflare，部署未配置授权的 Worker，再填写其公开 origin。

```sh
npm run writer:setup
```

本机向导仅监听 `127.0.0.1:8977`，通过 GitHub 官方 App manifest 流程预填权限和回调。确认创建后，向导将 `GITHUB_CLIENT_SECRET` 与随机 `SESSION_SECRET` 直接通过 Wrangler stdin 写入 Cloudflare Secrets，并仅把公开 client ID 写入配置。返回的私钥和 webhook secret 不保存，本方案不使用它们。最后在 GitHub 安装界面只选择博客仓库。

不要把 GitHub secret、token、私钥或 `.dev.vars` 提交到仓库，也不要发到聊天。向导页面链接 20 分钟后过期；若没有完成注册，可重新运行。

官方参考：[GitHub App 用户授权](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)、[App manifest](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest)、[Cloudflare 静态资源](https://developers.cloudflare.com/workers/static-assets/)、[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
