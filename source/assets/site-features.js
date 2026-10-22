(() => {
  'use strict';
  const privacyKey = 'hidden-space:analytics-optout';
  const dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  let optedOut = false;
  try { optedOut = localStorage.getItem(privacyKey) === '1'; } catch {}
  const post = document.getElementById('post');
  const article = document.getElementById('article-container');
  const bar = document.createElement('div'); bar.className = 'reading-progress'; bar.setAttribute('aria-hidden', 'true');
  if (post && article) {
    document.body.append(bar);
    let queued = false;
    const update = () => {
      queued = false;
      const top = article.getBoundingClientRect().top + scrollY;
      const distance = Math.max(1, article.offsetHeight - innerHeight * .6);
      bar.style.width = Math.max(0, Math.min(100, (scrollY - top + innerHeight * .25) / distance * 100)) + '%';
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update); update();
    const tools = document.createElement('div'); tools.className = 'post-reading-tools';
    const views = document.createElement('span'); views.id = 'article-views'; views.textContent = '阅读量 —'; views.title = '启用后累计；按半小时区间过滤重复浏览与常见爬虫';
    const copy = document.createElement('button'); copy.type = 'button'; copy.innerHTML = '<i class="fas fa-link" aria-hidden="true"></i> 复制链接';
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(location.origin + location.pathname); copy.textContent = '已复制'; setTimeout(() => { copy.innerHTML = '<i class="fas fa-link" aria-hidden="true"></i> 复制链接'; }, 2000); }
      catch { copy.textContent = '复制失败'; }
    };
    tools.append(views, copy); article.before(tools);
  }
  const footer = document.getElementById('footer');
  const stats = document.createElement('div'); stats.className = 'site-traffic';
  const total = document.createElement('span'); total.id = 'site-views'; total.textContent = '全站阅读量 —'; total.title = '统计启用后累计的去重浏览次数，不包含历史访问';
  const privacy = document.createElement('a'); privacy.href = '/privacy/'; privacy.textContent = '隐私说明';
  const settings = document.createElement('button'); settings.type = 'button'; settings.textContent = '统计设置';
  stats.append(total, privacy, settings); footer?.append(stats);
  const dialog = document.createElement('dialog'); dialog.className = 'privacy-dialog';
  dialog.innerHTML = '<form method="dialog"><h2>访问统计设置</h2><label><input type="checkbox" id="allow-traffic">允许去标识化访问统计</label><p id="traffic-preference"></p><button type="submit">关闭</button></form>';
  document.body.append(dialog);
  const toggle = dialog.querySelector('input'); toggle.checked = !optedOut && !dnt; toggle.disabled = dnt;
  dialog.querySelector('p').textContent = dnt ? '已遵循浏览器的禁止跟踪 / GPC 设置。' : '不保存原始 IP、姓名、完整来源地址或跨日访客标识。';
  settings.onclick = () => dialog.showModal();
  toggle.onchange = () => { optedOut = !toggle.checked; try { localStorage.setItem(privacyKey, optedOut ? '1' : '0'); } catch {} };
  async function counters(api) {
    const path = post ? location.pathname : '/';
    const result = await fetch(api + '/api/traffic/count?path=' + encodeURIComponent(path), { credentials: 'omit', signal: AbortSignal.timeout(8000) });
    if (!result.ok) return;
    const data = await result.json(); total.textContent = '全站阅读量 ' + Number(data.total).toLocaleString('zh-CN');
    const views = document.getElementById('article-views'); if (views) views.textContent = '阅读量 ' + Number(data.page).toLocaleString('zh-CN');
  }
  function comments(config) {
    if (!post || !config?.enabled) return;
    const section = document.createElement('section'); section.className = 'blog-comments'; section.id = 'post-comments';
    const heading = document.createElement('h2'); heading.textContent = '评论';
    const info = document.createElement('p'); info.className = 'comment-privacy'; info.textContent = 'GitHub 登录后可留言，昵称和评论公开显示。';
    const load = document.createElement('button'); load.type = 'button'; load.innerHTML = '<i class="fab fa-github" aria-hidden="true"></i> 加载评论';
    const fallback = document.createElement('a'); fallback.href = 'https://github.com/' + config.repo + '/discussions'; fallback.target = '_blank'; fallback.rel = 'noopener noreferrer'; fallback.textContent = '在 GitHub 查看';
    const mount = document.createElement('div'); mount.className = 'giscus';
    section.append(heading, info, load, fallback, mount); post.append(section);
    const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const allowedGiscus = 'https://giscus.app';
    load.onclick = () => {
      load.disabled = true; load.textContent = '加载中…';
      const script = document.createElement('script');
      const attributes = { src: allowedGiscus + '/client.js', 'data-repo': config.repo, 'data-repo-id': config.repoId, 'data-category': config.category, 'data-category-id': config.categoryId, 'data-mapping': 'pathname', 'data-strict': '1', 'data-reactions-enabled': '1', 'data-emit-metadata': '0', 'data-input-position': 'top', 'data-theme': theme(), 'data-lang': 'zh-CN', crossorigin: 'anonymous' };
      for (const [key, value] of Object.entries(attributes)) script.setAttribute(key, value);
      script.async = true; script.onerror = () => { load.disabled = false; load.textContent = '加载失败，重试'; script.remove(); };
      script.onload = () => { load.hidden = true; }; mount.append(script);
    };
    new MutationObserver(() => mount.querySelector('iframe')?.contentWindow.postMessage({ giscus: { setConfig: { theme: theme() } } }, allowedGiscus)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  fetch('/assets/features-config.json').then(r => r.json()).then(async config => {
    comments(config.comments);
    const permitted = new Set(['/', '/about/', '/archives/', '/tags/', '/categories/', '/courses/', '/projects/', '/writing/', '/links/']);
    await counters(config.api).catch(() => {});
    if (!post && !permitted.has(location.pathname)) return;
    if (dnt || optedOut || document.visibilityState !== 'visible') return;
    const event = { path: location.pathname, referrer: document.referrer };
    fetch(config.api + '/api/traffic/collect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event), credentials: 'omit', signal: AbortSignal.timeout(10000) }).then(response => response.ok ? counters(config.api) : null).catch(() => {});
  }).catch(() => {});
})();
