import MarkdownIt from 'markdown-it';
import { stringify } from 'yaml';
import { createElement, KeyRound, LogOut, Plus, RotateCcw, Download, Send, Image, Images, Upload, Bold, Italic, Heading2, Link, Quote, List, Code, X } from 'lucide';

const icons = { github: KeyRound, 'log-out': LogOut, plus: Plus, 'rotate-ccw': RotateCcw, download: Download, send: Send, image: Image, images: Images, upload: Upload, bold: Bold, italic: Italic, 'heading-2': Heading2, link: Link, quote: Quote, list: List, code: Code, x: X };
for (const el of document.querySelectorAll('[data-icon]')) el.replaceWith(createElement(icons[el.dataset.icon], { 'aria-hidden': 'true' }));
const $ = id => document.getElementById(id);
const md = new MarkdownIt({ html: false, linkify: true, breaks: false });
const fields = ['title', 'slug', 'categories', 'tags', 'description', 'body', 'mathjax'];
const state = { csrf: null, user: null, name: null, sha: null, cover: '/images/bg1.png', upload: null, images: [], posts: [], dirty: false, busy: false, publishing: null };
const draftKey = 'hidden-space-writer:draft:v1';
let previewTimer, draftTimer, statusTimer;
function notice(message, error = false) { $('notice').hidden = !message; $('notice').textContent = message; $('notice').classList.toggle('error', error); }
async function api(route, body) {
  const response = await fetch('/api/' + route, { credentials: 'same-origin', ...(body !== undefined ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf || '' }, body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) { if (response.status === 401) setUser(null); throw new Error(result.error || '请求失败'); }
  return result;
}
const list = value => value.split(/[,，]/).map(x => x.trim()).filter(Boolean);
const flatten = value => (Array.isArray(value) ? value.flat(Infinity) : value ? [value] : []).join(', ');
function input() {
  return { name: state.name || `${$('slug').value}.md`, baseSha: state.sha, title: $('title').value, slug: $('slug').value, body: $('body').value, description: $('description').value, categories: list($('categories').value), tags: list($('tags').value), mathjax: $('mathjax').checked, cover: state.cover, upload: state.upload };
}
function ready() {
  for (const field of fields) $(field).disabled = state.busy;
  for (const id of ['choose-cover', 'choose-image', 'upload', 'new']) $(id).disabled = state.busy;
  for (const button of document.querySelectorAll('.post-entry, [data-edit]')) button.disabled = state.busy;
  $('publish').disabled = !state.user || state.busy || !$('title').value.trim() || !$('body').value.trim() || (!state.name && !/^[a-z0-9][a-z0-9-]{0,79}$/.test($('slug').value));
  $('confirm-publish').disabled = state.busy;
}
function saveDraft() {
  try { localStorage.setItem(draftKey, JSON.stringify({ ...input(), savedAt: Date.now() })); $('draft-state').textContent = '已保存到此浏览器'; }
  catch { $('draft-state').textContent = '本机草稿保存失败，可导出 Markdown'; }
  $('restore').hidden = false;
}
function renderPreview() {
  $('preview').innerHTML = md.render($('body').value);
  for (const a of $('preview').querySelectorAll('a')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  for (const img of $('preview').querySelectorAll('img')) if (img.getAttribute('src')?.startsWith('/')) img.src = 'https://okazaki-yumemi.github.io' + img.getAttribute('src');
  $('word-count').textContent = `${$('body').value.replace(/\s/g, '').length} 字`;
}
function changed() {
  state.dirty = true; $('draft-state').textContent = '尚未发布'; ready();
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
  state.name = value.name || null; state.sha = value.baseSha || null; state.cover = value.cover || '/images/bg1.png'; state.upload = value.upload || null;
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
  if (state.dirty && !confirm('切换文章？当前内容已自动保存为本机草稿。')) return;
  if (state.dirty) saveDraft();
  try {
    const result = await api('post?name=' + encodeURIComponent(name));
    fill({ ...result.metadata, body: result.body, name, baseSha: result.sha, slug: String(result.metadata.permalink || name).replace(/\.html$|\.md$/g, '') });
    $('draft-state').textContent = '已加载仓库版本'; notice('');
  } catch (error) { notice(error.message, true); }
}
function setUser(user) {
  state.user = user; $('identity').textContent = user ? user.login : '未登录'; $('login').hidden = Boolean(user); $('logout').hidden = !user; ready();
}
function restoreDraft() {
  try { const value = JSON.parse(localStorage.getItem(draftKey)); if (value) { fill(value); state.dirty = true; $('draft-state').textContent = '已恢复本机草稿'; notice(''); } }
  catch { notice('草稿无法恢复，请使用已导出的 Markdown', true); }
}
function exportMarkdown() {
  const value = input(); const { name, baseSha, slug, upload, ...metadata } = value;
  const content = `---\n${stringify({ ...metadata, body: undefined, permalink: `${slug || 'draft'}.html` }).trim()}\n---\n\n${value.body}\n`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name || 'draft.md'; a.click(); URL.revokeObjectURL(url);
}
function toolbar(action) {
  const body = $('body'), start = body.selectionStart, end = body.selectionEnd, selected = body.value.slice(start, end);
  const formats = { bold: ['**', '**'], italic: ['*', '*'], heading: ['\n## ', '\n'], link: ['[', '](https://)'], quote: ['\n> ', '\n'], list: ['\n- ', '\n'], code: ['\n```\n', '\n```\n'] };
  const [before, after] = formats[action]; body.setRangeText(before + selected + after, start, end, 'select'); body.focus(); changed();
}
async function imageUpload(file) {
  if (!file) return;
  try {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('请选择不超过 20 MB 的 JPEG、PNG 或 WebP 图片');
    const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 1600 / image.width, 1000 / image.height);
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); image.close();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .82));
    if (!blob || blob.type !== 'image/webp' || blob.size > 2 * 1024 * 1024) throw new Error('封面转换失败或超过 2 MB，请换一张图片');
    const data = new Uint8Array(await blob.arrayBuffer()); let raw = '';
    for (let i = 0; i < data.length; i += 16384) raw += String.fromCharCode(...data.subarray(i, i + 16384));
    clearUpload(); state.upload = { data: btoa(raw) }; showCover(URL.createObjectURL(blob), `${Math.round(blob.size / 1024)} KB · 待发布`); changed(); notice('');
  } catch (error) { notice(error.message, true); }
}
async function chooseImages() {
  try {
    if (!state.images.length) state.images = await api('images');
    $('image-grid').replaceChildren();
    for (const image of state.images) {
      const button = document.createElement('button'); button.className = 'image-option'; button.type = 'button'; button.title = image.name;
      const img = document.createElement('img'); img.src = image.url; img.alt = image.name; img.loading = 'lazy'; const span = document.createElement('span'); span.textContent = image.name;
      button.append(img, span); button.onclick = () => { clearUpload(); state.cover = image.path; showCover(image.url, image.name.split('/').pop()); $('image-dialog').close(); changed(); }; $('image-grid').append(button);
    }
    $('image-dialog').showModal();
  } catch (error) { notice(error.message, true); }
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
  state.busy = true; ready(); saveDraft(); $('publish-dialog').close(); notice('正在提交文章和封面…');
  try {
    clearTimeout(statusTimer);
    const uploadedPreview = state.upload ? 'data:image/webp;base64,' + state.upload.data : null;
    const result = await api('publish', input());
    state.name = result.name; state.sha = null; state.dirty = false; $('slug').readOnly = true;
    notice('已提交到 GitHub，等待自动构建上线。'); $('draft-state').textContent = '已提交';
    // Refresh the base blob before allowing another edit, so stale tabs cannot overwrite it.
    const saved = await api('post?name=' + encodeURIComponent(result.name));
    fill({ ...saved.metadata, body: saved.body, name: result.name, baseSha: saved.sha, slug: $('slug').value });
    if (uploadedPreview) showCover(uploadedPreview, '封面已提交');
    state.posts = await api('posts'); state.images = []; renderPosts(); saveDraft(); state.dirty = false; $('draft-state').textContent = '已提交';
    checkPublication(result.sha);
  } catch (error) { notice(error.message + '。草稿仍保留在此浏览器，可导出。', true); }
  finally { state.busy = false; ready(); }
}
for (const field of fields) $(field).addEventListener('input', changed);
$('editor-form').onsubmit = event => event.preventDefault();
$('search').oninput = renderPosts;
$('new').onclick = () => { if (state.busy || state.dirty && !confirm('新建文章？当前内容会保留为本机草稿。')) return; if (state.dirty) saveDraft(); fill({}); $('draft-state').textContent = '新文章'; notice(''); };
$('restore').onclick = restoreDraft;
$('download').onclick = exportMarkdown;
$('choose-cover').onclick = chooseImages; $('choose-image').onclick = chooseImages;
$('close-images').onclick = () => $('image-dialog').close();
$('upload').onchange = event => imageUpload(event.target.files[0]);
for (const el of document.querySelectorAll('[data-edit]')) el.onclick = () => toolbar(el.dataset.edit);
for (const el of document.querySelectorAll('[data-view]')) el.onclick = () => { document.querySelector('.writing-area').dataset.mode = el.dataset.view; for (const other of document.querySelectorAll('[data-view]')) other.setAttribute('aria-pressed', String(other === el)); };
$('publish').onclick = () => { $('publish-title').textContent = $('title').value; $('publish-dialog').showModal(); };
$('cancel-publish').onclick = () => $('publish-dialog').close(); $('confirm-publish').onclick = publish;
$('logout').onclick = async () => { try { if (state.dirty) saveDraft(); await api('logout', {}); setUser(null); state.csrf = null; state.posts = []; renderPosts(); notice('已退出登录'); } catch (error) { notice(error.message, true); } };
window.addEventListener('beforeunload', event => { if (state.dirty || state.busy) { saveDraft(); event.preventDefault(); event.returnValue = ''; } });
fill({});
try { $('restore').hidden = !localStorage.getItem(draftKey); } catch {}
try {
  const session = await api('session'); state.csrf = session.csrf; setUser(session.user);
  if (!session.configured) { $('login').hidden = true; notice('写作后台尚未连接 GitHub', true); }
  if (session.user) { state.posts = await api('posts'); renderPosts(); }
} catch (error) { notice(error.message, true); }
