'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const { load } = require('cheerio');
const text = html => load(String(html || '')).text().replace(/\s+/g, ' ').trim();
hexo.extend.generator.register('tech-experience', function (locals) {
  const approved = new Set(JSON.parse(fs.readFileSync(path.join(hexo.base_dir, 'public-images.json'), 'utf8')));
  const catalog = locals.posts.toArray().filter(post => post.published && post.date.valueOf() <= Date.now()).map(post => {
    const plain = text(post.content);
    const chinese = (plain.match(/[\u3400-\u9fff]/g) || []).length;
    const words = (plain.match(/[a-zA-Z0-9]+/g) || []).length;
    const cover = typeof post.cover === 'string' && post.cover.startsWith('/images/') && approved.has(post.cover.slice(8)) ? post.cover : '/images/bg1.png';
    return { path: '/' + post.path.replace(/^\//, ''), title: String(post.title), description: text(post.description || post.excerpt || plain).slice(0, 180), date: post.date.format('YYYY-MM-DD'), tags: post.tags.toArray().map(t => t.name), tagPaths: Object.fromEntries(post.tags.toArray().map(t => [t.name, '/' + t.path])), categories: post.categories.toArray().map(c => c.name), cover, minutes: Math.max(1, Math.ceil(chinese / 350 + words / 220)) };
  }).sort((a, b) => b.date.localeCompare(a.date) || a.path.localeCompare(b.path));
  const routes = [{ path: 'assets/reading-index.json', data: JSON.stringify(catalog) }];
  for (const name of ['tech', 'atlas']) {
    const result = buildSync({ absWorkingDir: hexo.base_dir, entryPoints: [`client/${name}.mjs`], bundle: true, external: ['/assets/*'], format: 'esm', platform: 'browser', target: 'es2022', minify: true, write: false, legalComments: 'eof' });
    routes.push({ path: `assets/${name}.js`, data: result.outputFiles[0].text });
  }
  const licenses = ['d3-force', 'd3-zoom', 'd3-selection', 'd3-drag', 'd3-dispatch', 'd3-timer', 'd3-quadtree', 'd3-interpolate', 'd3-color', 'd3-transition', 'd3-ease'].map(name => `${name}\n${fs.readFileSync(path.join(hexo.base_dir, 'node_modules', name, 'LICENSE'), 'utf8')}`);
  routes.push({ path: 'assets/d3-LICENSE.txt', data: licenses.join('\n\n') });
  return routes;
});
