import { createMarkdownRenderer } from './markdown.mjs';
import { stringify } from 'yaml';
import { createElement, KeyRound, LogOut, Plus, RotateCcw, Download, Send, Image, Images, Upload, Bold, Italic, Heading2, Link, Quote, List, Code, X } from 'lucide';

const icons = { github: KeyRound, 'log-out': LogOut, plus: Plus, 'rotate-ccw': RotateCcw, download: Download, send: Send, image: Image, images: Images, upload: Upload, bold: Bold, italic: Italic, 'heading-2': Heading2, link: Link, quote: Quote, list: List, code: Code, x: X };
for (const el of document.querySelectorAll('[data-icon]')) el.replaceWith(createElement(icons[el.dataset.icon], { 'aria-hidden': 'true' }));
const $ = id => document.getElementById(id);
const md = createMarkdownRenderer();
const site = 'https://okazaki-yumemi.github.io';
const maxImageBytes = 12 * 1024 * 1024;
const fields = ['title', 'slug', 'categories', 'tags', 'description', 'body', 'mathjax'];
const state = { csrf: null, user: null, name: null, sha: null, cover: '/images/bg1.png', upload: null, images: [], pendingImages: [], committedPreviews: {}, posts: [], dirty: false, busy: false, revision: 0, imageMode: 'cover' };
const draftKey = 'hidden-space-writer:draft:v1';
let previewTimer, draftTimer, statusTimer;
// Image drafts can exceed localStorage's quota. Keep the entire draft together in IndexedDB.
const draftDatabase = new Promise((resolve, reject) => {
  const request = indexedDB.open('hidden-space-writer', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('drafts');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error('草稿数据库暂时不可用'));
});
draftDatabase.catch(() => {});
let draftSaveQueue = Promise.resolve();
async function draftRequest(mode, operation) {
  const database = await draftDatabase;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('drafts', mode);
    const request = operation(transaction.objectStore('drafts'));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = transaction.onabort = () => reject(transaction.error || request.error);
  });
}
async function readDraft() {
  const stored = await draftRequest('readonly', store => store.get('current')).catch(() => null);
  let legacy;
  try { legacy = JSON.parse(localStorage.getItem(draftKey)); } catch {}
  return legacy && (!stored || legacy.savedAt > stored.savedAt) ? legacy : stored;
}
function notice(message, error = false) { $('notice').hidden = !message; $('notice').textContent = message; $('notice').classList.toggle('error', error); }
async function api(route, body) {
  const response = await fetch('/api/' + route, { credentials: 'same-origin', ...(body !== undefined ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf || '' }, body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) { if (response.status === 401) setUser(null); throw new Error(result.error || '请求失败'); }
  return result;
}
const list = value => value.split(/[,，]/).map(x => x.trim()).filter(Boolean);
const flatten = value => (Array.isArray(value) ? value.flat(Infinity) : value ? [value] : []).join(', ');
const pendingPath = id => `/__writer_images/${id}.webp`;
const referencedImages = () => state.pendingImages.filter(image => $('body').value.includes(pendingPath(image.id)));
const imageBytes = image => Math.floor(image.data.length * 3 / 4) - (image.data.endsWith('==') ? 2 : image.data.endsWith('=') ? 1 : 0);
function checkImageLimits(images, cover = state.upload) {
  if (images.length > 12) throw new Error('每次发布最多上传 12 张正文图片，请分次发布');
  if (images.reduce((total, image) => total + imageBytes(image), cover ? imageBytes(cover) : 0) > maxImageBytes) throw new Error('待上传的正文图片和封面合计不能超过 12 MB，请压缩图片或分次发布');
}
function input() {
  return { name: state.name || `${$('slug').value}.md`, baseSha: state.sha, title: $('title').value, slug: $('slug').value, body: $('body').value, description: $('description').value, categories: list($('categories').value), tags: list($('tags').value), mathjax: $('mathjax').checked, cover: state.cover, upload: state.upload, images: referencedImages().map(({ id, data }) => ({ id, data })) };
}
function ready() {
  for (const field of fields) $(field).disabled = state.busy;
  for (const id of ['choose-cover', 'choose-image', 'upload', 'new', 'insert-image', 'body-upload', 'insert-image-url', 'image-url', 'image-alt', 'restore', 'download', 'search', 'logout']) $(id).disabled = state.busy;
  for (const label of document.querySelectorAll('label.button')) label.classList.toggle('disabled', state.busy);
  for (const button of document.querySelectorAll('.post-entry, [data-edit]')) button.disabled = state.busy;
  $('publish').disabled = !state.user || state.busy || !$('title').value.trim() || !$('body').value.trim() || (!state.name && !/^[a-z0-9][a-z0-9-]{0,79}$/.test($('slug').value));
  $('confirm-publish').disabled = state.busy;
}
function saveDraft() {
  const value = { ...input(), savedAt: Date.now() }, revision = state.revision;
  const save = async () => {
    try { await draftRequest('readwrite', store => store.put(value, 'current')); try { localStorage.removeItem(draftKey); } catch {} }
    catch {
      try { localStorage.setItem(draftKey, JSON.stringify(value)); }
      catch { if (revision === state.revision) $('draft-state').textContent = '本机草稿保存失败，请先发布或导出备份'; return false; }
    }
    $('restore').hidden = false;
    if (revision === state.revision) $('draft-state').textContent = '已保存到此浏览器';
    return true;
  };
  draftSaveQueue = draftSaveQueue.then(save, save);
  return draftSaveQueue;
}
function renderPreview() {
  $('preview').innerHTML = md.render($('body').value);
  for (const a of $('preview').querySelectorAll('a')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  for (const img of $('preview').querySelectorAll('img')) {
    const source = img.getAttribute('src');
    const pending = state.pendingImages.find(image => pendingPath(image.id) === source);
    if (pending) img.src = 'data:image/webp;base64,' + pending.data;
    else if (state.committedPreviews[source]) img.src = state.committedPreviews[source];
    else if (source) { try { img.src = new URL(source, site + '/').href; } catch { img.removeAttribute('src'); } }
  }
  $('word-count').textContent = `${$('body').value.replace(/\s/g, '').length} 字`;
  const pending = referencedImages();
  $('image-state').textContent = pending.length ? `${pending.length} 张正文图片待发布` : '';
}
function changed() {
  state.revision++; state.dirty = true; $('draft-state').textContent = '尚未发布'; ready();
  clearTimeout(previewTimer); previewTimer = setTimeout(renderPreview, 180);
  clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 700);
}
function showCover(url, label) { $('cover-preview').src = url; $('cover-state').textContent = label; }
function clearUpload() { if ($('cover-preview').src.startsWith('blob:')) URL.revokeObjectURL($('cover-preview').src); state.upload = null; $('upload').value = ''; }
function fill(value) {
  clearTimeout(draftTimer); clearTimeout(previewTimer);
  clearUpload();
  for (const field of fields) {
    if (field === 'mathjax') $(field).checked = Boolean(value[field]);
    else $(field).value = ['tags', 'categories'].includes(field) ? flatten(value[field]) : value[field] || '';
  }
  state.revision++; state.name = value.name || null; state.sha = value.baseSha || null; state.cover = value.cover || '/images/bg1.png'; state.upload = value.upload || null;
  state.pendingImages = Array.isArray(value.images) ? value.images.filter(image => typeof image.id === 'string' && typeof image.data === 'string') : [];
  state.committedPreviews = {};
  if (!state.name && !$('slug').value) $('slug').value = 'note-' + new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date()).replaceAll('-', '') + '-' + crypto.randomUUID().slice(0, 8);
  $('slug').readOnly = Boolean(state.name);
  showCover(state.upload ? 'data:image/webp;base64,' + state.upload.data : 'https://okazaki-yumemi.github.io' + state.cover, state.upload ? '待上传封面' : state.cover.split('/').pop());
  state.dirty = false; renderPreview(); ready(); renderPosts();
}
function renderPosts() {
  const query = $('search').value.toLowerCase(); $('posts').replaceChildren();
  for (const post of state.posts.filter(x => x.name.toLowerCase().includes(query) || (x.title || '').toLowerCase().includes(query))) {
    const button = document.createElement('button'); button.className = 'post-entry'; button.classList.toggle('active', post.name === state.name); button.textContent = post.title || post.name.replace(/\.md$/, ''); button.title = post.title || post.name;
    button.onclick = () => openPost(post.name); $('posts').append(button);
  }
  if (!$('posts').childElementCount) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = state.user ? '没有匹配的文章' : '登录后加载文章'; $('posts').append(p); }
}
async function openPost(name) {
  if (state.busy) return;
  if (state.dirty && !confirm('切换文章？当前内容会保留为本机草稿。')) return;
  state.busy = true; ready();
  try {
    if (state.dirty && !await saveDraft()) { notice('草稿保存失败，请先发布或导出备份，再切换文章。', true); return; }
    const result = await api('post?name=' + encodeURIComponent(name));
    fill({ ...result.metadata, body: result.body, name, baseSha: result.sha, slug: String(result.metadata.permalink || name).replace(/\.html$|\.md$/g, '') });
    $('draft-state').textContent = '已加载仓库版本'; notice('');
  } catch (error) { notice(error.message, true); }
  finally { state.busy = false; ready(); }
}
function setUser(user) {
  state.user = user; $('identity').textContent = user ? user.login : '未登录'; $('login').hidden = Boolean(user); $('logout').hidden = !user; ready();
}
async function restoreDraft() {
  if (state.busy) return;
  if (state.dirty && !confirm('恢复保存的草稿？当前编辑内容会被替换。')) return;
  clearTimeout(draftTimer);
  state.busy = true; ready();
  try { await draftSaveQueue; const value = await readDraft(); if (value) { fill(value); state.dirty = true; $('draft-state').textContent = '已恢复本机草稿'; notice(''); } }
  catch { notice('草稿无法恢复，请使用已导出的 Markdown', true); }
  finally { state.busy = false; ready(); }
}
function exportMarkdown() {
  const value = input(); const { name, baseSha, slug, upload, images, ...metadata } = value;
  const content = `---\n${stringify({ ...metadata, body: undefined, permalink: `${slug || 'draft'}.html` }).trim()}\n---\n\n${value.body}\n`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name || 'draft.md'; a.click(); URL.revokeObjectURL(url);
  if (upload || images.length) notice('Markdown 已导出；待发布图片仍保存在本机草稿中，请发布后再导出含正式图片地址的版本。');
}
function toolbar(action) {
  const body = $('body'), start = body.selectionStart, end = body.selectionEnd, selected = body.value.slice(start, end);
  const formats = { bold: ['**', '**'], italic: ['*', '*'], heading: ['\n## ', '\n'], link: ['[', '](https://)'], quote: ['\n> ', '\n'], list: ['\n- ', '\n'], code: ['\n```\n', '\n```\n'] };
  const [before, after] = formats[action]; body.setRangeText(before + selected + after, start, end, 'select'); body.focus(); changed();
}
async function convertImage(file, cover = false) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('请选择不超过 20 MB 的 JPEG、PNG 或 WebP 图片');
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, (cover ? 1600 : 2560) / image.width, (cover ? 1000 : 2560) / image.height);
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
  try { canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); }
  finally { image.close(); }
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', cover ? .82 : .88));
  if (!blob || blob.type !== 'image/webp' || blob.size > 2 * 1024 * 1024) throw new Error('图片转换失败或超过 2 MB，请压缩图片后重试');
  const bytes = new Uint8Array(await blob.arrayBuffer()); let raw = '';
  for (let i = 0; i < bytes.length; i += 16384) raw += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return { data: btoa(raw), blob };
}
async function imageUpload(file) {
  if (!file || state.busy) return;
  state.busy = true; ready(); notice('正在处理封面…');
  try {
    const image = await convertImage(file, true);
    checkImageLimits(referencedImages(), image);
    clearUpload(); state.upload = { data: image.data }; showCover(URL.createObjectURL(image.blob), `${Math.round(image.blob.size / 1024)} KB · 待发布`); changed(); notice('');
  } catch (error) { notice(error.message, true); }
  finally { state.busy = false; ready(); $('upload').value = ''; }
}
const escapeAlt = value => value.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/[\r\n]/g, ' ');
function insertImages(images, selection) {
  const body = $('body');
  const start = selection?.start ?? body.selectionStart, end = selection?.end ?? body.selectionEnd;
  const markdown = images.map(image => `![${escapeAlt(image.alt || '')}](${image.path})`).join('\n\n');
  const before = start > 0 && body.value[start - 1] !== '\n' ? '\n\n' : '';
  const after = end < body.value.length && body.value[end] !== '\n' ? '\n\n' : '\n';
  body.setRangeText(before + markdown + after, start, end, 'end');
  if (document.querySelector('.writing-area').dataset.mode === 'preview') document.querySelector('[data-view="split"]').click();
  body.focus(); changed(); renderPreview();
}
async function bodyImageUpload(files, selection) {
  if (!files.length || state.busy) return;
  const existing = referencedImages();
  if (existing.length + files.length > 12) { notice('每次发布最多上传 12 张正文图片，请分次发布', true); return; }
  selection ||= { start: $('body').selectionStart, end: $('body').selectionEnd };
  state.busy = true; ready(); notice('正在处理正文图片…');
  try {
    const images = [];
    for (const file of files) {
      const { data } = await convertImage(file);
      images.push({ id: crypto.randomUUID(), data, alt: file.name.replace(/\.[^.]+$/, '') || '图片' });
    }
    checkImageLimits([...existing, ...images]);
    state.pendingImages.push(...images);
    $('image-dialog').close();
    insertImages(images.map(image => ({ path: pendingPath(image.id), alt: image.alt })), selection);
    notice('图片已插入，发布时将随文章一起上传。');
    await saveDraft();
  } catch (error) { notice(error.message, true); }
  finally { state.busy = false; ready(); $('body-upload').value = ''; }
}
async function chooseImages(mode = 'cover') {
  if (state.busy) return;
  state.imageMode = mode;
  state.imageSelection = { start: $('body').selectionStart, end: $('body').selectionEnd };
  $('image-dialog-title').textContent = mode === 'body' ? '插入正文图片' : '选择封面';
  $('body-image-actions').hidden = mode !== 'body';
  $('image-dialog').showModal();
  try {
    if (!state.images.length) state.images = await api('images');
    $('image-grid').replaceChildren();
    for (const image of state.images) {
      const button = document.createElement('button'); button.className = 'image-option'; button.type = 'button'; button.title = image.name;
      const img = document.createElement('img'); img.src = image.url; img.alt = image.name; img.loading = 'lazy'; const span = document.createElement('span'); span.textContent = image.name;
      button.append(img, span); button.onclick = () => {
        if (state.busy) return;
        $('image-dialog').close();
        if (state.imageMode === 'body') insertImages([{ path: image.path, alt: image.name.split('/').pop().replace(/\.[^.]+$/, '') }], state.imageSelection);
        else { clearUpload(); state.cover = image.path; showCover(image.url, image.name.split('/').pop()); changed(); }
      }; $('image-grid').append(button);
    }
    $('image-library-state').textContent = state.images.length ? '已发布图片' : '暂无已发布图片';
  } catch (error) { $('image-library-state').textContent = error.message + (mode === 'body' ? '；仍可上传或使用图片链接。' : ''); }
}
function insertImageUrl() {
  if (state.busy) return;
  try {
    const url = new URL($('image-url').value.trim());
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('请填写不含账号密码的 HTTPS 图片地址');
    const path = url.href.replace(/\(/g, '%28').replace(/\)/g, '%29');
    $('image-dialog').close();
    insertImages([{ path, alt: $('image-alt').value.trim() }], state.imageSelection);
    $('image-url').value = ''; $('image-alt').value = ''; notice('');
  } catch { $('image-url').setCustomValidity('请填写有效的 HTTPS 图片地址'); $('image-url').reportValidity(); }
}
async function checkPublication(sha, attempts = 0) {
  try {
    const status = await api('status?sha=' + sha);
    const el = $('publication'); el.replaceChildren(document.createTextNode(status.status === 'completed' ? status.conclusion === 'success' ? '自动构建完成' : '构建未成功，仓库提交已保存' : '已提交，正在自动构建…'));
    const link = document.createElement('a'); link.href = status.url || `https://github.com/Okazaki-Yumemi/Okazaki-Yumemi.github.io/actions`; link.target = '_blank'; link.rel = 'noopener'; link.textContent = '查看进度'; el.append(link);
    if (status.status !== 'completed' && attempts < 60) statusTimer = setTimeout(() => checkPublication(sha, attempts + 1), 10000);
  } catch { $('publication').textContent = '提交已保存，暂时无法获取构建状态'; }
}
async function publish() {
  clearTimeout(draftTimer);
  state.busy = true; ready(); saveDraft(); $('publish-dialog').close(); notice('正在提交文章和图片…');
  try {
    clearTimeout(statusTimer);
    const submitted = input();
    checkImageLimits(submitted.images);
    const uploadedPreview = state.upload ? 'data:image/webp;base64,' + state.upload.data : null;
    const result = await api('publish', submitted);
    const imagePreviews = {};
    for (const image of submitted.images) {
      const path = result.images?.[image.id];
      if (path) {
        $('body').value = $('body').value.replaceAll(pendingPath(image.id), path);
        imagePreviews[path] = 'data:image/webp;base64,' + image.data;
      }
    }
    state.pendingImages = []; state.committedPreviews = imagePreviews;
    state.name = result.name; state.sha = result.postSha || null; state.cover = result.cover || state.cover; clearUpload(); state.dirty = false; $('slug').readOnly = true;
    if (uploadedPreview) showCover(uploadedPreview, '封面已提交');
    renderPreview(); await saveDraft();
    notice('已提交到 GitHub，等待自动构建上线。'); $('draft-state').textContent = '已提交';
    state.images = []; checkPublication(result.sha);
    // Refresh the base blob before allowing another edit, so stale tabs cannot overwrite it.
    let saved;
    try { saved = await api('post?name=' + encodeURIComponent(result.name)); }
    catch (error) { notice('文章和图片已提交；暂时无法刷新仓库版本：' + error.message, true); return; }
    fill({ ...saved.metadata, body: saved.body, name: result.name, baseSha: saved.sha, slug: $('slug').value });
    state.committedPreviews = imagePreviews; renderPreview();
    if (uploadedPreview) showCover(uploadedPreview, '封面已提交');
    try { state.posts = await api('posts'); renderPosts(); } catch {}
    await saveDraft(); state.dirty = false; $('draft-state').textContent = '已提交';
  } catch (error) { notice(error.message + '。草稿仍保留在此浏览器，可导出。', true); }
  finally { state.busy = false; ready(); }
}
for (const field of fields) $(field).addEventListener('input', changed);
$('editor-form').onsubmit = event => event.preventDefault();
$('search').oninput = renderPosts;
$('new').onclick = async () => {
  if (state.busy || state.dirty && !confirm('新建文章？当前内容会保留为本机草稿。')) return;
  state.busy = true; ready();
  try {
    if (state.dirty && !await saveDraft()) { notice('草稿保存失败，请先发布或导出备份，再新建文章。', true); return; }
    fill({}); $('draft-state').textContent = '新文章'; notice('');
  } finally { state.busy = false; ready(); }
};
$('restore').onclick = restoreDraft;
$('download').onclick = exportMarkdown;
$('choose-cover').onclick = () => chooseImages('cover'); $('choose-image').onclick = () => chooseImages('cover');
$('insert-image').onclick = () => chooseImages('body');
$('close-images').onclick = () => $('image-dialog').close();
$('upload').onchange = event => imageUpload(event.target.files[0]);
$('body-upload').onchange = event => bodyImageUpload([...event.target.files], state.imageSelection);
$('insert-image-url').onclick = insertImageUrl;
$('image-url').oninput = () => $('image-url').setCustomValidity('');
$('image-url').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); insertImageUrl(); } };
$('body').addEventListener('paste', event => {
  const files = [...(event.clipboardData?.items || [])].filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter(Boolean);
  if (files.length) { event.preventDefault(); bodyImageUpload(files); }
});
$('body').addEventListener('dragover', event => {
  if ([...(event.dataTransfer?.types || [])].includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = state.busy ? 'none' : 'copy'; $('body').classList.add('is-dragging'); }
});
$('body').addEventListener('dragleave', () => $('body').classList.remove('is-dragging'));
$('body').addEventListener('drop', event => {
  $('body').classList.remove('is-dragging');
  if (event.dataTransfer?.files.length) { event.preventDefault(); bodyImageUpload([...event.dataTransfer.files]); }
});
for (const el of document.querySelectorAll('[data-edit]')) el.onclick = () => toolbar(el.dataset.edit);
for (const el of document.querySelectorAll('[data-view]')) el.onclick = () => { document.querySelector('.writing-area').dataset.mode = el.dataset.view; for (const other of document.querySelectorAll('[data-view]')) other.setAttribute('aria-pressed', String(other === el)); };
$('publish').onclick = () => { $('publish-title').textContent = $('title').value; $('publish-dialog').showModal(); };
$('cancel-publish').onclick = () => $('publish-dialog').close(); $('confirm-publish').onclick = publish;
$('logout').onclick = async () => { try { if (state.dirty) saveDraft(); await api('logout', {}); setUser(null); state.csrf = null; state.posts = []; renderPosts(); notice('已退出登录'); } catch (error) { notice(error.message, true); } };
window.addEventListener('beforeunload', event => { if (state.dirty || state.busy) { saveDraft(); event.preventDefault(); event.returnValue = ''; } });
fill({});
readDraft().then(value => { if (value) $('restore').hidden = false; }).catch(() => {});
try {
  const session = await api('session'); state.csrf = session.csrf; setUser(session.user);
  if (!session.configured) { $('login').hidden = true; notice('写作后台尚未连接 GitHub', true); }
  if (session.user) { state.posts = await api('posts'); renderPosts(); }
} catch (error) { notice(error.message, true); }
