import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import { slugize } from 'hexo-util';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'public');
const expected = ['index.html', 'post-1.html', 'post-2.html', 'post-3.html', 'archives/index.html',
  'tags/index.html', 'categories/index.html', 'about/index.html', 'projects/index.html',
  'courses/index.html', 'writing/index.html', 'links/index.html', 'write/index.html', 'privacy/index.html',
  'assets/site-features.js', 'assets/site-features.css', 'traffic-pages.json', '404.html', 'search.xml',
  'atlas/index.html', 'desk/index.html', 'assets/tech.js', 'assets/atlas.js', 'assets/reading-index.json', 'assets/tech.css', 'assets/d3-LICENSE.txt'];
for (const file of expected) assert((await stat(path.join(output, file))).size > 0, `Missing ${file}`);
const signature = '时刻铭记自己的弱小 时刻压制自己的傲慢';
const homepage = load(await readFile(path.join(output, 'index.html'), 'utf8'));
assert(homepage('script').toArray().some(el => homepage(el).text().includes(`typedJSFn.processSubtitle(["${signature}"])`)), 'Homepage signature mismatch');
assert.equal(homepage('.author-info-description').text().trim(), signature, 'Author signature mismatch');
const friendPage = load(await readFile(path.join(output, 'links/index.html'), 'utf8'));
assert.equal(friendPage('.flink-list-item a').attr('href'), 'https://muqi132.github.io/', 'Friend link missing');
assert.equal(friendPage('.flink-item-name').text().trim(), 'MUQI', 'Friend name mismatch');
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
const features = JSON.parse(await readFile(path.join(output, 'assets/features-config.json'), 'utf8'));
assert.equal(features.api, new URL(JSON.parse(await readFile(path.join(root, 'writer-site.json'), 'utf8')).url).origin);
assert.equal(features.comments.repo, 'Okazaki-Yumemi/Okazaki-Yumemi.github.io');
assert(features.comments.repoId && features.comments.categoryId, 'Comment discussion IDs missing');
assert.deepEqual(JSON.parse(await readFile(path.join(root, 'giscus.json'), 'utf8')).origins, ['https://okazaki-yumemi.github.io']);
const trafficPages = JSON.parse(await readFile(path.join(output, 'traffic-pages.json'), 'utf8'));
assert.equal(new Set(trafficPages.map(page => page.path)).size, trafficPages.length, 'Duplicate traffic paths');
assert.equal(trafficPages.filter(page => page.path.endsWith('.html')).length, sourcePosts.length, 'Traffic manifest must include every post');
for (const page of trafficPages) {
  assert(/^\/(?:[a-zA-Z0-9_-]+\/|[a-zA-Z0-9_-]+\.html)?$/.test(page.path) && typeof page.title === 'string', 'Unsafe traffic path');
}
assert(homepage('script[src="/assets/site-features.js?v=2"]').length, 'Site features not injected');
assert.equal((search.match(/<entry>/g) || []).length, sourcePosts.length, 'Search must include every post');
const readingIndex = JSON.parse(await readFile(path.join(output, 'assets/reading-index.json'), 'utf8'));
assert.equal(readingIndex.length, sourcePosts.length, 'Reading index must include every public post');
assert.equal(new Set(readingIndex.map(post => post.path)).size, sourcePosts.length, 'Duplicate reading index paths');
for (const post of readingIndex) {
  assert(/^\/[a-zA-Z0-9_-]+\.html$/.test(post.path), 'Unsafe reading path');
  assert(approvedImages.includes(post.cover.slice(8)), 'Unapproved graph cover');
  assert(post.minutes > 0 && post.minutes < 1000 && Array.isArray(post.tags), 'Invalid reading metadata');
  assert((await stat(path.join(output, post.path))).isFile(), 'Missing graph article');
  for (const tagPath of Object.values(post.tagPaths)) assert((await stat(path.join(output, decodeURIComponent(tagPath), 'index.html'))).isFile(), 'Broken tag path');
}
assert(homepage('script[src="/assets/tech.js?v=1"][type=module]').length, 'Technical features not injected');
const allowedRepositories = JSON.parse(await readFile(path.join(root, 'public-sources.json'), 'utf8'));
const tagAliases = JSON.parse(await readFile(path.join(root, 'tag-aliases.json'), 'utf8'));
for (const [alias, canonical] of Object.entries(tagAliases)) {
  if (readingIndex.some(post => post.tags.includes(alias))) continue;
  const targets = Array.isArray(canonical) ? canonical : [canonical];
  const redirect = load(await readFile(path.join(output, 'tags', slugize(alias), 'index.html'), 'utf8'));
  assert.equal(Boolean(redirect('meta[http-equiv="refresh"]').length), targets.length === 1, `Invalid merged-tag redirect: ${alias}`);
  assert.equal(redirect('a').length, targets.length, `Missing merged-tag choices: ${alias}`);
  for (const [i, name] of targets.entries()) {
    const target = redirect('a').eq(i).attr('href');
    const canonicalPost = readingIndex.find(post => post.tags.includes(name));
    assert.equal(target, canonicalPost ? encodeURI(canonicalPost.tagPaths[name]) : '/tags/', `Invalid canonical tag: ${alias}`);
  }
}
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
