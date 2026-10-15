import { OWNER, REPO, OWNER_ID, SITE, PREFIX, Problem, requireValue, postName, splitPost, decodeText, encode64, validateUpload, approvedImage, makePost } from './content.mjs';

const encoder = new TextEncoder();
const SESSION = '__Host-blog-session';
const OAUTH = '__Host-blog-oauth';
const security = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data: https:; connect-src 'self'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://github.com"
};
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { ...security, 'Content-Type': 'application/json; charset=utf-8', ...headers } });
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
const base64url = bytes => encode64(bytes).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const unbase64url = value => Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
const cookie = (name, value, age) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const cookies = request => Object.fromEntries((request.headers.get('Cookie') || '').split(';').map(p => p.trim().split('=')));
const same = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let result = 0; for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
};
export async function seal(value, secret, context) {
  requireValue(typeof secret === 'string' && secret.length >= 43, '服务端会话密钥未配置', 503);
  const raw = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(context) }, key, encoder.encode(JSON.stringify(value))));
  const bytes = new Uint8Array(iv.length + encrypted.length); bytes.set(iv); bytes.set(encrypted, iv.length);
  return base64url(bytes);
}
export async function unseal(value, secret, context) {
  try {
    if (!value || !secret) return null;
    const bytes = unbase64url(value);
    const raw = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: encoder.encode(context) }, key, bytes.slice(12));
    const parsed = JSON.parse(new TextDecoder().decode(plain));
    return parsed.exp > Date.now() ? parsed : null;
  } catch { return null; }
}
async function readJson(request, limit = 4 * 1024 * 1024) {
  requireValue(request.headers.get('Content-Type')?.startsWith('application/json'), '需要 JSON 请求', 415);
  const reader = request.body?.getReader();
  requireValue(reader, '请求为空');
  let size = 0; const parts = [];
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new Problem(413, '请求过大'); }
    parts.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Problem(400, 'JSON 格式不正确'); }
}

export function createWorker(upstream = fetch) {
  async function github(path, token, method = 'GET', body) {
    const response = await upstream(PREFIX + path, { method, headers: {
      Accept: 'application/vnd.github+json', 'User-Agent': 'Hidden-Space-Writer', 'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {})
    }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (response.status === 404) return null;
    requireValue(response.ok, response.status === 401 ? 'GitHub 登录已失效，请重新登录' : response.status === 409 || response.status === 422 ? '仓库已有新变更，请重新加载文章后再发布' : 'GitHub 请求失败，请检查 App 的仓库权限或稍后重试', response.status === 401 ? 401 : response.status === 409 || response.status === 422 ? 409 : 502);
    return response.status === 204 ? {} : response.json();
  }
  async function publicRepo() {
    const repo = await github('', null);
    requireValue(repo && repo.private === false && repo.visibility === 'public' && repo.full_name === `${OWNER}/${REPO}` && repo.owner.id === OWNER_ID && repo.default_branch === 'main', '目标仓库不是预期的公开博客，已拒绝访问', 403);
    return repo;
  }
  const file = (path, token, ref = 'main') => github(`/contents/${path}?ref=${encodeURIComponent(ref)}`, token);
  async function fetchFile(path, token, ref) {
    const result = await file(path, token, ref);
    requireValue(result?.type === 'file' && result.encoding === 'base64' && result.content !== undefined, '找不到所需文件', 404);
    return result;
  }
  async function publish(input, session) {
    const name = postName(input.name);
    const head = await github('/git/ref/heads/main', session.token);
    requireValue(head?.object?.sha, '找不到博客分支', 502);
    const headSha = head.object.sha;
    const existing = await file(`source/_posts/${name}`, session.token, headSha);
    requireValue(existing ? same(input.baseSha, existing.sha) : input.baseSha === null, '文章已被其他页面修改，请先重新加载；当前草稿仍可导出', 409);
    const previous = existing ? splitPost(decodeText(existing.content)) : null;
    if (!existing) {
      requireValue(name === `${input.slug}.md`, '文章文件名与网址不一致');
      requireValue(!await file(`${input.slug}.html`, session.token, headSha), '这个文章网址已被使用', 409);
    }
    const imagesFile = await fetchFile('public-images.json', session.token, headSha);
    const images = JSON.parse(decodeText(imagesFile.content));
    requireValue(Array.isArray(images), '图片白名单格式不正确', 502);
    let cover = input.cover;
    const changes = [];
    if (input.upload) {
      const bytes = validateUpload(input.upload);
      const image = `covers/upload-${crypto.randomUUID()}.webp`;
      changes.push({ path: `images/${image}`, content: encode64(bytes), encoding: 'base64' });
      images.push(image);
      changes.push({ path: 'public-images.json', content: JSON.stringify(images, null, 2) + '\n', encoding: 'utf-8' });
      cover = `/images/${image}`;
    } else {
      requireValue(typeof cover === 'string' && cover.startsWith('/images/') && approvedImage(cover.slice(8)) && images.includes(cover.slice(8)), '请选择仓库中的已发布封面');
    }
    const content = makePost(input, previous, cover);
    const mentioned = [...content.matchAll(/https:\/\/github\.com\/Okazaki-Yumemi\/([A-Za-z0-9_.-]+)/g)].map(match => match[1]);
    if (mentioned.length) {
      const allowed = JSON.parse(decodeText((await fetchFile('public-sources.json', session.token, headSha)).content));
      requireValue(Array.isArray(allowed) && mentioned.every(name => allowed.includes(name)), '正文引用了尚未确认公开的本人仓库，请先核对 public-sources.json；后台不会访问其他仓库');
    }
    changes.push({ path: `source/_posts/${name}`, content, encoding: 'utf-8' });
    const parent = await github(`/git/commits/${headSha}`, session.token);
    const tree = [];
    for (const change of changes) {
      const blob = await github('/git/blobs', session.token, 'POST', { content: change.content, encoding: change.encoding });
      tree.push({ path: change.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const newTree = await github('/git/trees', session.token, 'POST', { base_tree: parent.tree.sha, tree });
    const commit = await github('/git/commits', session.token, 'POST', { message: `${existing ? 'Update' : 'Publish'} post: ${input.title.trim()}`, tree: newTree.sha, parents: [headSha] });
    const updated = await github('/git/refs/heads/main', session.token, 'PATCH', { sha: commit.sha, force: false });
    requireValue(updated?.object?.sha === commit.sha, '提交尚未写入分支，请重新加载仓库确认', 502);
    return { sha: commit.sha, name, content, url: `${SITE}/${previous?.metadata.permalink || `${input.slug}.html`}`, commitUrl: `https://github.com/${OWNER}/${REPO}/commit/${commit.sha}` };
  }
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      try {
        if (!url.pathname.startsWith('/api/')) {
          const response = await env.ASSETS.fetch(request);
          const headers = new Headers(response.headers);
          for (const [key, value] of Object.entries(security)) headers.set(key, value);
          return new Response(response.body, { status: response.status, headers });
        }
        const configured = Boolean(env.PUBLIC_ORIGIN && env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.SESSION_SECRET?.length >= 43);
        const context = `blog-writer:${env.PUBLIC_ORIGIN}`;
        const session = await unseal(cookies(request)[SESSION], env.SESSION_SECRET, context + ':session');
        if (url.pathname === '/api/session' && request.method === 'GET') return json({ configured, user: session?.id === OWNER_ID ? { login: OWNER, id: OWNER_ID } : null, csrf: session?.id === OWNER_ID ? session.csrf : null, site: SITE });
        requireValue(configured && env.PUBLIC_ORIGIN === url.origin && url.protocol === 'https:', '写作后台尚未完成安全配置', 503);
        if (url.pathname === '/api/auth/login' && request.method === 'GET') {
          const repo = await publicRepo();
          const state = random(); const verifier = random();
          const value = await seal({ state, verifier, repoId: repo.id, exp: Date.now() + 10 * 60 * 1000 }, env.SESSION_SECRET, context + ':oauth');
          const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))));
          const target = new URL('https://github.com/login/oauth/authorize');
          target.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${url.origin}/api/auth/callback`, state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
          return new Response(null, { status: 302, headers: { ...security, Location: target.href, 'Set-Cookie': cookie(OAUTH, value, 600) } });
        }
        if (url.pathname === '/api/auth/callback' && request.method === 'GET') {
          const flow = await unseal(cookies(request)[OAUTH], env.SESSION_SECRET, context + ':oauth');
          requireValue(flow && same(flow.state, url.searchParams.get('state')) && url.searchParams.get('code'), '登录验证失败，请重新登录', 403);
          const tokenResponse = await upstream('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get('code'), redirect_uri: `${url.origin}/api/auth/callback`, code_verifier: flow.verifier, repository_id: String(flow.repoId) }) });
          const token = await tokenResponse.json();
          requireValue(tokenResponse.ok && token.access_token && !token.error, 'GitHub 授权失败，请重试', 403);
          const userResponse = await upstream('https://api.github.com/user', { headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Hidden-Space-Writer' } });
          const user = await userResponse.json();
          requireValue(userResponse.ok && user.id === OWNER_ID && user.login === OWNER, '这个 GitHub 账号没有写作权限', 403);
          await publicRepo();
          await fetchFile('public-images.json', token.access_token);
          const age = Math.min(7200, Number(token.expires_in) || 7200);
          const value = await seal({ token: token.access_token, id: OWNER_ID, csrf: random(), exp: Date.now() + age * 1000 }, env.SESSION_SECRET, context + ':session');
          const headers = new Headers({ ...security, Location: '/' });
          headers.append('Set-Cookie', cookie(SESSION, value, age)); headers.append('Set-Cookie', cookie(OAUTH, '', 0));
          return new Response(null, { status: 303, headers });
        }
        requireValue(session?.id === OWNER_ID, '请先使用指定的 GitHub 账号登录', 401);
        if (request.method !== 'GET') {
          requireValue(request.headers.get('Origin') === env.PUBLIC_ORIGIN && same(request.headers.get('X-CSRF-Token'), session.csrf), '请求来源验证失败', 403);
        }
        if (url.pathname === '/api/logout' && request.method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': cookie(SESSION, '', 0) });
        await publicRepo();
        if (url.pathname === '/api/posts' && request.method === 'GET') {
          const entries = await file('source/_posts', session.token);
          requireValue(Array.isArray(entries), '读取文章列表失败', 502);
          let index = [];
          try {
            const response = await upstream(`${SITE}/writer-posts.json`, { signal: AbortSignal.timeout(5000) });
            if (response.ok) { const value = await response.json(); if (Array.isArray(value)) index = value; }
          } catch {}
          return json(entries.filter(x => x.type === 'file' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}\.md$/.test(x.name)).map(x => ({ name: x.name, sha: x.sha, title: index.find(p => p.name === x.name)?.title || x.name.replace(/\.md$/, '') })));
        }
        if (url.pathname === '/api/post' && request.method === 'GET') {
          const name = postName(url.searchParams.get('name'));
          const result = await fetchFile(`source/_posts/${name}`, session.token);
          return json({ name, sha: result.sha, ...splitPost(decodeText(result.content)) });
        }
        if (url.pathname === '/api/images' && request.method === 'GET') {
          const list = JSON.parse(decodeText((await fetchFile('public-images.json', session.token)).content));
          return json(list.filter(approvedImage).map(name => ({ name, path: `/images/${name}`, url: `${SITE}/images/${name}` })));
        }
        if (url.pathname === '/api/publish' && request.method === 'POST') return json(await publish(await readJson(request), session), 201);
        if (url.pathname === '/api/status' && request.method === 'GET') {
          const sha = url.searchParams.get('sha');
          requireValue(/^[0-9a-f]{40}$/.test(sha || ''), '提交编号不正确');
          const runs = await github(`/actions/workflows/blog.yml/runs?head_sha=${sha}&per_page=1`, session.token);
          const run = runs?.workflow_runs?.[0];
          return json(run ? { status: run.status, conclusion: run.conclusion, url: run.html_url } : { status: 'queued', conclusion: null });
        }
        return json({ error: '接口不存在' }, 404);
      } catch (error) {
        return json({ error: error instanceof Problem ? error.message : '服务暂时不可用，请稍后重试' }, error instanceof Problem ? error.status : 500);
      }
    }
  };
}
export default createWorker();
