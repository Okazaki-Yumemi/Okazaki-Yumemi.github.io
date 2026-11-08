import { parse, stringify } from 'yaml';

export const OWNER = 'Okazaki-Yumemi';
export const REPO = 'Okazaki-Yumemi.github.io';
export const OWNER_ID = 259598129;
export const REPO_ID = 1176004251;
export const SITE = 'https://okazaki-yumemi.github.io';
export const PREFIX = `https://api.github.com/repos/${OWNER}/${REPO}`;
export const MAX_BODY = 512 * 1024;
export const MAX_IMAGE = 2 * 1024 * 1024;
export const MAX_IMAGES = 12;
export const MAX_UPLOAD_TOTAL = 12 * 1024 * 1024;
export const MAX_PUBLISH_REQUEST = 18 * 1024 * 1024;

export class Problem extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function requireValue(condition, message, status = 400) {
  if (!condition) throw new Problem(status, message);
}
export function postName(value) {
  requireValue(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}\.md$/.test(value), '文章文件名不合法');
  return value;
}
export function splitPost(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  requireValue(match, '文章缺少 YAML 元数据');
  const metadata = parse(match[1], { maxAliasCount: 20 });
  requireValue(metadata && typeof metadata === 'object' && !Array.isArray(metadata), '元数据格式不正确');
  return { metadata, body: source.slice(match[0].length).replace(/^\r?\n/, '') };
}
export function text(value, max, label, empty = false) {
  requireValue(typeof value === 'string' && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), `${label}不合法`);
  requireValue(empty || value.trim().length > 0, `${label}不能为空`);
  return value.trim();
}
export function stringList(value, label) {
  requireValue(Array.isArray(value) && value.length <= 12, `${label}最多 12 项`);
  return [...new Set(value.map(item => text(item, 40, label)))];
}
export function decode64(value) {
  try {
    const raw = atob(value.replaceAll('\n', ''));
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }
  catch { throw new Problem(400, '文件编码不正确'); }
}
export function encode64(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i += 16384) result += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return btoa(result);
}
export const decodeText = value => new TextDecoder('utf-8', { fatal: true }).decode(decode64(value));
export function validateUpload(upload) {
  requireValue(upload && typeof upload.data === 'string' && upload.data.length <= Math.ceil(MAX_IMAGE * 4 / 3) + 8, '每张图片不能超过 2 MB');
  const bytes = decode64(upload.data);
  requireValue(bytes.length >= 16 && bytes.length <= MAX_IMAGE, '图片大小不合法');
  requireValue(new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP', '只接受转换后的 WebP 图片');
  const declared = new DataView(bytes.buffer, bytes.byteOffset).getUint32(4, true);
  requireValue(declared + 8 === bytes.length, 'WebP 文件长度不正确');
  return bytes;
}
export function approvedImage(name) {
  return typeof name === 'string' && /^(?:covers\/)?[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(?:png|jpe?g|webp|gif)$/i.test(name) && !name.includes('..') && !/cursor-|left-pet|right-pet/.test(name);
}
export function prepareImages(input, approved) {
  text(input.body, MAX_BODY, '正文');
  const pending = input.images ?? [];
  requireValue(Array.isArray(pending) && pending.length <= MAX_IMAGES, `正文一次最多上传 ${MAX_IMAGES} 张图片`);
  const byId = new Map();
  for (const image of pending) {
    requireValue(image && typeof image.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(image.id), '待上传图片标识不合法');
    requireValue(!byId.has(image.id), '待上传图片标识重复');
    byId.set(image.id, image);
  }
  const uploads = [], mapping = {};
  let total = 0;
  function add(upload) {
    const bytes = validateUpload(upload);
    total += bytes.length;
    requireValue(total <= MAX_UPLOAD_TOTAL, '封面和正文待上传图片合计不能超过 12 MB');
    const name = `covers/upload-${crypto.randomUUID()}.webp`;
    uploads.push({ name, bytes });
    return `/images/${name}`;
  }
  let cover = input.cover;
  if (input.upload) cover = add(input.upload);
  else requireValue(typeof cover === 'string' && cover.startsWith('/images/') && approvedImage(cover.slice(8)) && approved.includes(cover.slice(8)), '请选择仓库中的已发布封面');
  const body = input.body.replace(/\/__writer_images\/([^\s)"'<>\]]+)/g, (placeholder, filename) => {
    const id = filename.endsWith('.webp') ? filename.slice(0, -5) : '';
    requireValue(byId.has(id), '正文中的待上传图片缺失，请重新选择图片或恢复包含图片的本机草稿');
    if (!mapping[id]) mapping[id] = add(byId.get(id));
    return mapping[id];
  });
  requireValue(!body.includes('/__writer_images/'), '正文中的待上传图片地址不完整，请重新选择图片');
  return { body, cover, uploads, mapping, images: [...new Set([...approved, ...uploads.map(image => image.name)])] };
}
export function makePost(input, previous, cover, now = new Date()) {
  const title = text(input.title, 180, '标题');
  text(input.body, MAX_BODY, '正文');
  const body = input.body.replaceAll('\r\n', '\n').trimEnd();
  requireValue(!/[\r\n\t]/.test(title), '标题不能包含换行或制表符');
  const description = text(input.description || '', 240, '摘要', true);
  const tags = stringList(input.tags || [], '标签');
  const categories = stringList(input.categories || [], '分类');
  requireValue(typeof input.mathjax === 'boolean', '公式开关不合法');
  let metadata;
  if (previous) {
    metadata = { ...previous.metadata };
  } else {
    const slug = text(input.slug, 80, '网址标识');
    requireValue(/^[a-z0-9][a-z0-9-]*$/.test(slug) && !['index', '404', 'search', 'feed', 'atom', 'sitemap', 'robots'].includes(slug), '网址标识只能使用小写字母、数字和短横线，且不能使用保留名称');
    metadata = { date: now.toISOString(), permalink: `${slug}.html` };
  }
  Object.assign(metadata, { title, updated: now.toISOString(), categories, tags, cover, description, mathjax: input.mathjax });
  return `---\n${stringify(metadata, { lineWidth: 0 }).trimEnd()}\n---\n\n${body}\n`;
}
