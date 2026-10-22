export const shelfKey = 'hidden-space:reading-desk:v1';
export const safePath = value => typeof value === 'string' && /^\/[a-zA-Z0-9_-]+\.html$/.test(value);
export const normalize = value => String(value || '').normalize('NFKC').toLowerCase().trim();
export function searchPosts(posts, query = '', tag = '') {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return posts.filter(post => (!tag || post.tags.includes(tag)) && terms.every(term => normalize([post.title, post.description, ...post.tags, ...post.categories].join(' ')).includes(term)))
    .map(post => ({ post, rank: terms.reduce((sum, term) => sum + (normalize(post.title).includes(term) ? 4 : 0) + (post.tags.some(t => normalize(t) === term) ? 3 : 0), 0) }))
    .sort((a, b) => b.rank - a.rank || b.post.date.localeCompare(a.post.date)).map(x => x.post);
}
export function createShelf(storage) {
  let state = { saved: [], progress: {} };
  let persistent = Boolean(storage);
  try {
    const raw = JSON.parse(storage?.getItem(shelfKey) || 'null');
    if (raw) {
      state.saved = [...new Set((Array.isArray(raw.saved) ? raw.saved : []).filter(safePath))].slice(0, 200);
      for (const [path, entry] of Object.entries(raw.progress || {}).slice(-200)) {
        if (safePath(path) && Number.isFinite(entry?.ratio) && Number.isFinite(entry?.at)) state.progress[path] = { ratio: Math.max(0, Math.min(1, entry.ratio)), at: entry.at };
      }
    }
  } catch { persistent = false; }
  const save = () => { try { storage?.setItem(shelfKey, JSON.stringify(state)); persistent = Boolean(storage); } catch { persistent = false; } };
  return {
    persistent: () => persistent,
    snapshot: () => structuredClone(state),
    toggle(path) { if (!safePath(path)) return false; state.saved = state.saved.includes(path) ? state.saved.filter(x => x !== path) : [...state.saved, path].slice(-200); save(); return state.saved.includes(path); },
    mark(path, ratio, at = Date.now()) { if (!safePath(path) || !Number.isFinite(ratio)) return; state.progress[path] = { ratio: Math.max(0, Math.min(1, ratio)), at }; state.progress = Object.fromEntries(Object.entries(state.progress).sort((a,b) => b[1].at-a[1].at).slice(0,200)); save(); },
    removeProgress(path) { delete state.progress[path]; save(); }
  };
}
export function graphData(posts) {
  const nodes = posts.map(post => ({ id: post.path, kind: 'post', label: post.title, post }));
  const tags = new Map(), links = [];
  for (const post of posts) {
    for (const tag of post.tags.length ? post.tags : ['未标记']) {
      const id = 'tag:' + tag;
      if (!tags.has(id)) tags.set(id, { id, kind: 'tag', label: tag, path: post.tagPaths?.[tag], count: 0 });
      tags.get(id).count++;
      links.push({ source: post.path, target: id });
    }
  }
  return { nodes: [...nodes, ...tags.values()], links };
}
