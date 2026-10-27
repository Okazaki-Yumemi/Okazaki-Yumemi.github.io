'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { slugize } = require('hexo-util');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

hexo.extend.generator.register('merged-tag-redirects', function (locals) {
  const aliases = JSON.parse(fs.readFileSync(path.join(hexo.base_dir, 'tag-aliases.json'), 'utf8'));
  const tags = locals.tags.toArray();
  return Object.entries(aliases).filter(([name]) => !tags.some(tag => tag.name === name)).map(([name, canonical]) => {
    const names = Array.isArray(canonical) ? canonical : [canonical];
    const targets = names.map(label => {
      const tag = tags.find(tag => tag.name === label);
      return { name: label, route: '/' + (tag?.path || hexo.config.tag_dir + '/') };
    });
    const route = targets.length === 1 ? targets[0].route : '/' + hexo.config.tag_dir + '/';
    const refresh = targets.length === 1 ? `<meta http-equiv="refresh" content="0;url=${escape(encodeURI(route))}">` : '';
    const links = targets.map(target => `<li><a href="${escape(encodeURI(target.route))}">${escape(target.name)}</a></li>`).join('');
    const slug = slugize(hexo.config.tag_map?.[name] || name, { transform: hexo.config.filename_case });
    return {
      path: `${hexo.config.tag_dir}/${slug}/index.html`,
      data: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><link rel="canonical" href="${escape(new URL(route, hexo.config.url).href)}">${refresh}<title>标签已合并</title></head><body><h1>标签已合并</h1><p>“${escape(name)}”的文章现在按以下主题归档：</p><ul>${links}</ul></body></html>`
    };
  });
});
