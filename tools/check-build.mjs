import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'public');
const expected = ['index.html', 'post-1.html', 'post-2.html', 'post-3.html', 'archives/index.html',
  'tags/index.html', 'categories/index.html', 'about/index.html', 'projects/index.html',
  'courses/index.html', 'writing/index.html', '404.html', 'search.xml'];
for (const file of expected) assert((await stat(path.join(output, file))).size > 0, `Missing ${file}`);
assert.equal(await stat(path.join(output, 'project-sjtu-monitor.html')).catch(() => null), null, 'Removed article must not be generated');
const wallpaperCss = await readFile(path.join(output, 'assets/blog.css'), 'utf8');
assert.match(wallpaperCss, /#page-header\s*\{[^}]*background-image:\s*none\s*!important/s, 'Headers must share the site wallpaper layer');
assert.match(wallpaperCss, /#page-header\s*\{[^}]*background-color:\s*transparent\s*!important/s, 'Headers must reveal the site wallpaper');
const approvedImages = JSON.parse(await readFile(path.join(root, 'public-images.json'), 'utf8'));
for (const name of approvedImages) {
  assert((await readFile(path.join(output, 'images', name))).equals(await readFile(path.join(root, 'images', name))), `Asset changed: ${name}`);
}
const posts = await Promise.all([1, 2, 3].map(i => readFile(path.join(output, `post-${i}.html`), 'utf8')));
assert.match(posts[0], /mjx-container/, 'Math was not rendered');
assert.match(posts[0], /Science and Magic, perfectly encapsulated!/, 'Code block missing');
assert.match(posts[1], /Ich hätte das Dunkel ertragen können/, 'Unicode content missing');
assert.match(posts[2], /https:\/\/sjtu-empty-classroom-radar-1.onrender.com\//, 'Project link missing');
const search = await readFile(path.join(output, 'search.xml'), 'utf8');
const sourcePosts = (await readdir(path.join(root, 'source/_posts'))).filter(name => name.endsWith('.md'));
assert.equal((search.match(/<entry>/g) || []).length, sourcePosts.length, 'Search must include every post');
const allowedRepositories = JSON.parse(await readFile(path.join(root, 'public-sources.json'), 'utf8'));
for (const name of sourcePosts) {
  const source = await readFile(path.join(root, 'source/_posts', name), 'utf8');
  for (const match of source.matchAll(/https:\/\/github\.com\/Okazaki-Yumemi\/([A-Za-z0-9_.-]+)/g)) {
    assert(allowedRepositories.includes(match[1]), `Unapproved repository reference in ${name}`);
  }
}

let pages = 0;
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) { await inspect(filename); continue; }
    if (!entry.name.endsWith('.html')) continue;
    pages++;
    const $ = load(await readFile(filename, 'utf8'));
    for (const element of $('a[href], img[src], script[src], link[href]').toArray()) {
      const value = $(element).attr('href') || $(element).attr('src');
      if (!value || value.startsWith('#') || /^[a-z]+:|^\/\//i.test(value)) continue;
      const targetUrl = new URL(value, `https://okazaki-yumemi.github.io/${path.relative(output, filename).replaceAll('\\', '/')}`);
      let target = path.join(output, decodeURIComponent(targetUrl.pathname));
      if (targetUrl.pathname.endsWith('/')) target = path.join(target, 'index.html');
      assert((await stat(target).catch(() => null))?.isFile(), `Broken link in ${filename}: ${value}`);
    }
  }
}
await inspect(output);
console.log(`Verified ${pages} pages, ${sourcePosts.length} posts, approved assets and public sources, code, math, search and all local links.`);
