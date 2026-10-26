import { parse, stringify } from 'yaml';

export const OWNER = 'Okazaki-Yumemi';
export const REPO = 'Okazaki-Yumemi.github.io';
export const OWNER_ID = 259598129;
export const REPO_ID = 1176004251;
export const SITE = 'https://okazaki-yumemi.github.io';
export const PREFIX = `https://api.github.com/repos/${OWNER}/${REPO}`;
export const MAX_BODY = 512 * 1024;
export const MAX_IMAGE = 2 * 1024 * 1024;

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
  try { return Uint8Array.from(atob(value.replaceAll('\n', '')), c => c.charCodeAt(0)); }
  catch { throw new Problem(400, '文件编码不正确'); }
}
export function encode64(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i += 16384) result += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return btoa(result);
}
export const decodeText = value => new TextDecoder('utf-8', { fatal: true }).decode(decode64(value));
export function validateUpload(upload) {
  requireValue(upload && typeof upload.data === 'string' && upload.data.length <= Math.ceil(MAX_IMAGE * 4 / 3) + 8, '封面不能超过 2 MB');
  const bytes = decode64(upload.data);
  requireValue(bytes.length >= 16 && bytes.length <= MAX_IMAGE, '封面大小不合法');
  requireValue(new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP', '只接受转换后的 WebP 封面');
  const declared = new DataView(bytes.buffer, bytes.byteOffset).getUint32(4, true);
  requireValue(declared + 8 === bytes.length, 'WebP 文件长度不正确');
  return bytes;
}
export function approvedImage(name) {
  return typeof name === 'string' && /^(?:covers\/)?[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(?:png|jpe?g|webp|gif)$/i.test(name) && !name.includes('..') && !/cursor-|left-pet|right-pet/.test(name);
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
