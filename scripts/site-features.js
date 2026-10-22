'use strict';
const fs = require('node:fs');
const path = require('node:path');
hexo.extend.generator.register('site-features-config', function (locals) {
  const { url } = JSON.parse(fs.readFileSync(path.join(hexo.base_dir, 'writer-site.json'), 'utf8'));
  const features = JSON.parse(fs.readFileSync(path.join(hexo.base_dir, 'site-features.json'), 'utf8'));
  const hubs = [['/', '首页'], ['/about/', '关于'], ['/archives/', '归档'], ['/tags/', '标签'], ['/categories/', '分类'], ['/courses/', '课程'], ['/projects/', '项目'], ['/writing/', '文字'], ['/links/', '友链']].map(([route, title]) => ({ path: route, title }));
  const posts = locals.posts.toArray().filter(post => post.published && post.date.valueOf() <= Date.now()).map(post => ({ path: '/' + post.path.replace(/^\//, ''), title: post.title }));
  return [
    { path: 'assets/features-config.json', data: JSON.stringify({ api: new URL(url).origin, comments: features.comments }) },
    { path: 'traffic-pages.json', data: JSON.stringify([...hubs, ...posts]) }
  ];
});
