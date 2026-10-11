import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'public');
const expected = ['index.html', 'post-1.html', 'post-2.html', 'post-3.html', 'archives/index.html',
  'tags/index.html', 'categories/index.html', 'about/index.html', 'projects/index.html', '404.html', 'search.xml'];
for (const file of expected) assert((await stat(path.join(output, file))).size > 0, `Missing ${file}`);
for (const name of await readdir(path.join(root, 'images'))) {
  assert((await readFile(path.join(output, 'images', name))).equals(await readFile(path.join(root, 'images', name))), `Asset changed: ${name}`);
}
const posts = await Promise.all([1, 2, 3].map(i => readFile(path.join(output, `post-${i}.html`), 'utf8')));
assert.match(posts[0], /mjx-container/, 'Math was not rendered');
assert.match(posts[0], /Science and Magic, perfectly encapsulated!/, 'Code block missing');
assert.match(posts[1], /Ich hätte das Dunkel ertragen können/, 'Unicode content missing');
assert.match(posts[2], /https:\/\/sjtu-empty-classroom-radar-1.onrender.com\//, 'Project link missing');
const search = await readFile(path.join(output, 'search.xml'), 'utf8');
assert.equal((search.match(/<entry>/g) || []).length, 3, 'Search must include all three posts');

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
console.log(`Verified ${pages} pages, 3 posts, original assets, code, math, search and all local links.`);
