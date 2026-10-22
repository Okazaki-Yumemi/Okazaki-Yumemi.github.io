import { createShelf, searchPosts } from './core.mjs';
const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
const icon = name => { const node = el('i', null, 'fas fa-' + name); node.setAttribute('aria-hidden', 'true'); return node; };
function iconButton(name, title, callback) { const node = el('button', null, 'tech-icon'); node.type = 'button'; node.title = title; node.setAttribute('aria-label', title); node.append(icon(name)); node.onclick = callback; return node; }
let storage; try { storage = localStorage; } catch {}
const shelf = createShelf(storage);
let catalogPromise;
const catalog = () => catalogPromise ||= fetch('/assets/reading-index.json').then(response => { if (!response.ok) throw new Error('文章索引暂不可用'); return response.json(); }).catch(error => { catalogPromise = null; throw error; });
const hubs = [{ title: '知识图谱', path: '/atlas/', tags: [], categories: [], description: '', date: '' }, { title: '阅读台', path: '/desk/', tags: [], categories: [], description: '', date: '' }, { title: '文章归档', path: '/archives/', tags: [], categories: [], description: '', date: '' }, { title: '在线写作', path: '/write/', tags: [], categories: [], description: '', date: '' }];

const palette = el('dialog', null, 'command-palette'); palette.setAttribute('aria-label', '快速导航');
const commandHeader = el('div', null, 'command-header');
const input = el('input'); input.type = 'search'; input.placeholder = '搜索文章、标签和页面'; input.setAttribute('aria-label', '搜索文章、标签和页面'); input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-controls', 'command-results'); input.autocomplete = 'off';
commandHeader.append(icon('magnifying-glass'), input, iconButton('xmark', '关闭快速导航', () => palette.close()));
const list = el('div', null, 'command-results'); list.id = 'command-results'; list.setAttribute('role', 'listbox');
const status = el('div', '', 'command-status'); status.setAttribute('role', 'status');
palette.append(commandHeader, list, status); document.body.append(palette);
let active = 0, commands = [], posts = [];
function highlight(index) {
  active = Math.max(0, Math.min(index, commands.length - 1));
  for (const [i, node] of [...list.children].entries()) node.setAttribute('aria-selected', String(i === active));
  if (list.children[active]) { input.setAttribute('aria-activedescendant', list.children[active].id); list.children[active].scrollIntoView({ block: 'nearest' }); }
  else input.removeAttribute('aria-activedescendant');
}
function renderCommands() {
  const query = input.value;
  commands = [...searchPosts(hubs, query), ...searchPosts(posts, query)].slice(0, 40); list.replaceChildren();
  for (const [i, record] of commands.entries()) {
    const row = el('a', null, 'command-result'); row.href = record.path; row.id = 'command-' + i; row.setAttribute('role', 'option'); row.tabIndex = -1;
    row.append(icon(record.minutes ? 'file-lines' : record.path === '/atlas/' ? 'diagram-project' : 'arrow-right'));
    const content = el('span'); content.append(el('strong', record.title), el('small', record.minutes ? `${record.date} · ${record.tags.slice(0, 4).join(' / ')} · ${record.minutes} 分钟` : '页面')); row.append(content); list.append(row);
    row.addEventListener('pointermove', () => highlight(i));
  }
  status.textContent = commands.length ? `${commands.length} 项结果` : '没有找到匹配内容'; input.setAttribute('aria-expanded', String(Boolean(commands.length))); highlight(0);
}
async function openPalette() {
  if (document.querySelector('dialog[open]') && !palette.open) return;
  if (!palette.open) palette.showModal(); input.focus(); input.value = ''; commands = []; list.replaceChildren(); input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); status.textContent = '正在加载…';
  try { posts = await catalog(); if (palette.open) renderCommands(); } catch (error) { list.replaceChildren(); status.textContent = error.message; }
}
input.addEventListener('input', renderCommands);
input.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); highlight(active + (event.key === 'ArrowDown' ? 1 : -1)); }
  if (event.key === 'Enter' && commands[active]) { event.preventDefault(); location.assign(commands[active].path); }
});
palette.addEventListener('click', event => { if (event.target === palette) { const r = palette.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) palette.close(); } });
addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !event.isComposing && document.activeElement?.tagName !== 'TEXTAREA' && !document.activeElement?.isContentEditable) { event.preventDefault(); if (palette.open) palette.close(); else openPalette(); }
});
const launch = iconButton('terminal', '快速导航', openPalette); launch.classList.add('command-launch'); document.querySelector('#menus')?.prepend(launch);
const actions = document.querySelector('#site-info');
if (actions) { const link = el('a', null, 'blog-write-link tech-atlas-entry'); link.href = '/atlas/'; link.append(icon('diagram-project'), el('span', '知识图谱')); actions.append(link); }

const article = document.querySelector('#post #article-container');
if (article) {
  const path = location.pathname, tools = document.querySelector('.post-reading-tools') || el('div', null, 'post-reading-tools');
  if (!tools.isConnected) article.before(tools);
  const group = el('div', null, 'reading-actions');
  const saveNotice = el('span', '', 'reading-save-notice'); saveNotice.setAttribute('role', 'status');
  const saved = iconButton('bookmark', '收藏文章', () => { shelf.toggle(path); updateSaved(); saveNotice.textContent = shelf.persistent() ? '' : '本机存储不可用，收藏无法保留'; });
  function updateSaved() { const on = shelf.snapshot().saved.includes(path); saved.setAttribute('aria-pressed', String(on)); saved.title = on ? '取消收藏' : '收藏文章'; saved.setAttribute('aria-label', saved.title); }
  updateSaved();
  const focus = iconButton('expand', '专注阅读', () => { const on = document.body.classList.toggle('tech-focus'); focus.setAttribute('aria-pressed', String(on)); focus.title = on ? '退出专注阅读' : '专注阅读'; focus.setAttribute('aria-label', focus.title); focus.replaceChildren(icon(on ? 'compress' : 'expand')); });
  focus.setAttribute('aria-pressed', 'false');
  addEventListener('keydown', event => { if (event.key === 'Escape' && document.body.classList.contains('tech-focus') && !document.querySelector('dialog[open]')) focus.click(); });
  const desk = el('a', null, 'tech-icon'); desk.href = '/desk/'; desk.title = '阅读台'; desk.setAttribute('aria-label', '阅读台'); desk.append(icon('book-open'));
  group.append(saved, focus, desk); tools.append(group, saveNotice);
  const previous = shelf.snapshot().progress[path];
  if (previous && previous.ratio > .03 && previous.ratio < .97) {
    const resume = el('button', `继续阅读 ${Math.round(previous.ratio * 100)}%`, 'resume-reading'); resume.type = 'button'; resume.onclick = () => { const top = article.getBoundingClientRect().top + scrollY; window.scrollTo({ top: top + previous.ratio * Math.max(1, article.offsetHeight - innerHeight * .6) - innerHeight * .25, behavior: 'instant' }); resume.remove(); }; tools.append(resume);
  }
  let timer;
  const remember = () => { const top = article.getBoundingClientRect().top + scrollY; const ratio = (scrollY - top + innerHeight * .25) / Math.max(1, article.offsetHeight - innerHeight * .6); if (ratio > .02) shelf.mark(path, ratio); };
  addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(remember, 700); }, { passive: true });
  addEventListener('pagehide', remember);
  document.addEventListener('visibilitychange', () => { if (document.hidden) remember(); });
}

const deskRoot = document.getElementById('reading-desk');
if (deskRoot) {
  document.body.classList.add('tech-workspace');
  try {
    const entries = await catalog(); deskRoot.replaceChildren();
    const toolbar = el('div', null, 'desk-toolbar'), modes = el('div', null, 'tech-segments'), search = el('input'); search.type = 'search'; search.placeholder = '搜索阅读台'; search.setAttribute('aria-label', '搜索阅读台');
    const cards = el('div', null, 'desk-list'), note = el('p', shelf.persistent() ? '收藏与阅读位置仅保存在当前浏览器。' : '本机存储不可用，收藏与阅读位置无法保留。', 'desk-local-note');
    let mode = 'saved';
    const tabs = ['收藏', '最近阅读'].map((label, i) => { const button = el('button', label); button.type = 'button'; button.onclick = () => { mode = i ? 'recent' : 'saved'; render(); }; modes.append(button); return button; });
    toolbar.append(modes, search); deskRoot.append(toolbar, note, cards);
    function render() {
      const state = shelf.snapshot(); tabs.forEach((tab, i) => tab.setAttribute('aria-pressed', String((mode === 'saved') === !i)));
      const matching = searchPosts(entries.filter(post => mode === 'saved' ? state.saved.includes(post.path) : state.progress[post.path]), search.value);
      if (mode === 'recent') matching.sort((a,b) => state.progress[b.path].at - state.progress[a.path].at);
      cards.replaceChildren();
      if (!matching.length) { cards.append(el('p', search.value ? '没有匹配的记录' : mode === 'saved' ? '还没有收藏的文章' : '还没有阅读记录', 'desk-empty')); const link = el('a', '浏览文章'); link.href = '/archives/'; cards.append(link); }
      for (const post of matching) {
        const row = el('article', null, 'desk-post'), imageLink = el('a'); imageLink.href = post.path; imageLink.tabIndex = -1; imageLink.setAttribute('aria-hidden', 'true');
        const image = el('img'); image.src = post.cover; image.alt = ''; image.loading = 'lazy'; image.width = 160; image.height = 100; imageLink.append(image);
        const copy = el('div', null, 'desk-post-copy'), heading = el('h2'), link = el('a', post.title); link.href = post.path; heading.append(link);
        const ratio = state.progress[post.path]?.ratio; copy.append(heading, el('small', `${post.date} · ${post.minutes} 分钟${ratio == null ? '' : ' · ' + (ratio >= .97 ? '已读完' : '读到 ' + Math.round(ratio * 100) + '%')}`), el('p', post.description));
        const remove = iconButton(mode === 'saved' ? 'bookmark' : 'xmark', mode === 'saved' ? '取消收藏' : '移除阅读记录', () => { if (mode === 'saved') shelf.toggle(post.path); else shelf.removeProgress(post.path); render(); });
        row.append(imageLink, copy, remove); cards.append(row);
      }
    }
    search.addEventListener('input', render); addEventListener('storage', event => { if (event.key === 'hidden-space:reading-desk:v1') location.reload(); }); render();
  } catch (error) { deskRoot.replaceChildren(el('p', error.message)); }
}
const atlasRoot = document.getElementById('knowledge-atlas');
if (atlasRoot) {
  document.body.classList.add('tech-workspace');
  try { const [module, posts] = await Promise.all([import('/assets/atlas.js?v=1'), catalog()]); module.mountAtlas(atlasRoot, posts); }
  catch { atlasRoot.replaceChildren(el('p', '图谱暂时不可用，请刷新重试。')); const link = el('a', '查看全部标签'); link.href = '/tags/'; atlasRoot.append(link); }
}
