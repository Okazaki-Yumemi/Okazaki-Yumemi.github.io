'use strict';
const fs = require('node:fs');
const path = require('node:path');
hexo.extend.generator.register('writer-post-index', function (locals) {
  const posts = locals.posts.toArray().filter(post => post.published && post.date.valueOf() <= Date.now());
  return { path: 'writer-posts.json', data: JSON.stringify(posts.map(post => ({ name: path.basename(post.full_source), title: post.title, path: post.path }))) };
});
hexo.extend.tag.register('writer_entry', function () {
  const { url } = JSON.parse(fs.readFileSync(path.join(hexo.base_dir, 'writer-site.json'), 'utf8'));
  if (!url) return '<p>写作后台尚未连接。</p>';
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash) throw new Error('Writer URL must be a clean HTTPS URL');
  return `<p><a class="btn" href="${target.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}" rel="noopener noreferrer"><i class="fab fa-github" aria-hidden="true"></i> GitHub 登录写作</a></p>`;
});
