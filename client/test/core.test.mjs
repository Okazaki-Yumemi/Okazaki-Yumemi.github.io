import test from 'node:test';
import assert from 'node:assert/strict';
import { createShelf, searchPosts, graphData, shelfKey, safePath } from '../core.mjs';
const posts = [
  { path: '/a.html', title: 'CUDA 入门', tags: ['GPU', 'CUDA'], categories: ['课程'], description: '线程与内存', date: '2026-10-20' },
  { path: '/b.html', title: '项目总结', tags: ['GPU'], categories: ['项目'], description: 'CUDA 实践', date: '2026-10-21' },
  { path: '/c.html', title: '随笔', tags: [], categories: ['随笔'], description: '文字', date: '2026-10-19' }
];
test('search combines terms, ranks title hits and filters real tags', () => {
  assert.deepEqual(searchPosts(posts, 'cuda').map(x => x.path), ['/a.html', '/b.html']);
  assert.equal(searchPosts(posts, 'ＧＰＵ cuda', 'CUDA').length, 1);
  assert.equal(searchPosts(posts, 'gpu 不存在').length, 0);
  assert.equal(searchPosts(posts, '', 'CUDA')[0].path, '/a.html');
});
test('graph represents only actual post/tag memberships, including untagged posts', () => {
  const graph = graphData(posts);
  assert.equal(graph.nodes.length, 6); assert.equal(graph.links.length, 4);
  assert.equal(graph.nodes.find(n => n.id === 'tag:GPU').count, 2);
  assert(graph.links.every(edge => graph.nodes.some(n => n.id === edge.source) && graph.nodes.some(n => n.id === edge.target)));
  assert.deepEqual(graphData([]), { nodes: [], links: [] });
});
test('reading state is local, bounded and survives reload without backend calls', () => {
  const memory = new Map(); const storage = { getItem: k => memory.get(k), setItem: (k,v) => memory.set(k,v) };
  const shelf = createShelf(storage); assert.equal(shelf.toggle('/a.html'), true); shelf.mark('/a.html', .42, 123);
  const reloaded = createShelf(storage); assert.deepEqual(reloaded.snapshot(), { saved: ['/a.html'], progress: { '/a.html': { ratio: .42, at: 123 } } });
  assert.equal(reloaded.toggle('/a.html'), false); reloaded.mark('/b.html', 3, 124); assert.equal(reloaded.snapshot().progress['/b.html'].ratio, 1);
  reloaded.removeProgress('/a.html'); assert(!reloaded.snapshot().progress['/a.html']);
});
test('corrupt or blocked local storage does not break reading or accept unsafe paths', () => {
  for (const storage of [undefined, { getItem() { throw Error(); }, setItem() { throw Error(); } }, { getItem: () => '{invalid' }]) {
    const shelf = createShelf(storage); assert.equal(shelf.toggle('/a.html'), true); assert.equal(shelf.toggle('https://evil.test/a.html'), false);
    shelf.mark('../secret', .5); assert.equal(Object.keys(shelf.snapshot().progress).length, 0);
  }
  assert.equal(safePath('/a.html?secret=x'), false);
});
test('untrusted persisted state is validated, not rendered or sent as a URL', () => {
  const shelf = createShelf({ getItem: k => k === shelfKey ? JSON.stringify({ saved: ['/a.html', '/a.html', 'javascript:alert(1)'], progress: { '/b.html': { ratio: -.5, at: 12 }, '/c.html': { ratio: 'x', at: 1 } } }) : null });
  assert.deepEqual(shelf.snapshot(), { saved: ['/a.html'], progress: { '/b.html': { ratio: 0, at: 12 } } });
});
