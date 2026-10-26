import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker, seal, unseal } from '../worker.mjs';
import { OWNER, OWNER_ID, REPO_ID, PREFIX, postName, encode64, splitPost, makePost, validateUpload, approvedImage } from '../content.mjs';

const env = { PUBLIC_ORIGIN: 'https://writer.example', GITHUB_CLIENT_ID: 'client', GITHUB_CLIENT_SECRET: 'not-a-real-secret', SESSION_SECRET: 'a'.repeat(64) };
const context = 'blog-writer:https://writer.example:session';
const session = { id: OWNER_ID, token: 'fake-test-token', csrf: 'test-csrf', exp: Date.now() + 60000 };
const cookie = '__Host-blog-session=' + await seal(session, env.SESSION_SECRET, context);
const base = { name: 'new-note.md', baseSha: null, slug: 'new-note', title: '我的文章', body: '## 标题\n\n正文', categories: ['随笔'], tags: ['生活'], description: '', mathjax: false, cover: '/images/bg1.png' };
const response = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const source = '---\ntitle: 旧标题\ndate: 2026-01-01 10:00:00\npermalink: old-url.html\ncustom: 保留\n---\n\n旧正文\n';
const file = text => ({ type: 'file', encoding: 'base64', sha: 'blob-old', content: encode64(new TextEncoder().encode(text)) });
function mock(options = {}) {
  const calls = [];
  const worker = createWorker(async (url, init = {}) => {
    calls.push({ url, ...init, parsed: init.body ? JSON.parse(init.body) : null });
    if (url === 'https://okazaki-yumemi.github.io/writer-posts.json') return new Response('{}', { status: 404 });
    assert(url.startsWith(PREFIX), `Unexpected external call: ${url}`);
    if (url === PREFIX) return response({ id: options.repoId ?? REPO_ID, private: Boolean(options.private), visibility: options.private ? 'private' : 'public', full_name: `${OWNER}/Okazaki-Yumemi.github.io`, owner: { id: OWNER_ID }, default_branch: 'main' });
    const path = new URL(url).pathname.replace(new URL(PREFIX).pathname, '');
    if (path === '/git/ref/heads/main') return response({ object: { sha: 'a'.repeat(40) } });
    if (path === '/contents/public-images.json') return response(file('["bg1.png","covers/cover-01.webp","bgm.mp3"]'));
    if (path === '/contents/public-sources.json') return response(file('["CS336"]'));
    if (path === '/contents/source/_posts/old.md') return response(file(source));
    if (path === '/contents/source/_posts') return response([{ type: 'file', name: 'old.md', sha: 'blob-old' }]);
    if (path.startsWith('/contents/')) return new Response('{}', { status: 404 });
    if (path.startsWith('/git/commits/') && init.method === 'GET') return response({ tree: { sha: 'tree-old' } });
    if (path === '/git/blobs') return response({ sha: 'blob-' + calls.length });
    if (path === '/git/trees') return response({ sha: 'tree-new' });
    if (path === '/git/commits') return response({ sha: 'b'.repeat(40) });
    if (path === '/git/refs/heads/main') return options.race ? new Response('{}', { status: 422 }) : response({ object: { sha: 'b'.repeat(40) } });
    if (path.includes('/actions/workflows/blog.yml/runs')) return response({ workflow_runs: [] });
    throw new Error('Unhandled request ' + url);
  });
  return { worker, calls };
}
function request(path, body, overrides = {}) {
  return new Request(env.PUBLIC_ORIGIN + path, { method: body === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, Origin: env.PUBLIC_ORIGIN, 'X-CSRF-Token': session.csrf, 'Content-Type': 'application/json', ...overrides }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
for (const path of ['/api/posts', '/api/images', '/api/post?name=old.md', '/api/status?sha=' + 'a'.repeat(40)]) {
  test('anonymous cannot read ' + path, async () => {
    const { worker, calls } = mock();
    const result = await worker.fetch(new Request(env.PUBLIC_ORIGIN + path), env);
    assert.equal(result.status, 401); assert.equal(calls.length, 0);
  });
}
test('anonymous cannot publish', async () => {
  const { worker, calls } = mock();
  assert.equal((await worker.fetch(request('/api/publish', base, { Cookie: '' }), env)).status, 401); assert.equal(calls.length, 0);
});
test('other user session is rejected on server', async () => {
  const value = await seal({ ...session, id: 123 }, env.SESSION_SECRET, context);
  const { worker, calls } = mock();
  assert.equal((await worker.fetch(request('/api/posts', undefined, { Cookie: '__Host-blog-session=' + value }), env)).status, 401); assert.equal(calls.length, 0);
});
test('encrypted session cannot be tampered with or moved across origins', async () => {
  assert.equal(await unseal(cookie.split('=')[1] + 'bad', env.SESSION_SECRET, context), null);
  assert.equal(await unseal(cookie.split('=')[1], env.SESSION_SECRET, context + '-other'), null);
  const expired = await seal({ ...session, exp: 1 }, env.SESSION_SECRET, context);
  assert.equal(await unseal(expired, env.SESSION_SECRET, context), null);
});
for (const headers of [{ Origin: 'https://evil.example' }, { 'X-CSRF-Token': '' }, { 'X-CSRF-Token': 'bad' }, { Origin: '' }]) {
  test('cross-origin / CSRF publish rejected ' + JSON.stringify(headers), async () => {
    const { worker, calls } = mock();
    assert.equal((await worker.fetch(request('/api/publish', base, headers), env)).status, 403); assert.equal(calls.length, 0);
  });
}
test('private repository fails closed before content access', async () => {
  const { worker, calls } = mock({ private: true });
  assert.equal((await worker.fetch(request('/api/publish', base), env)).status, 403); assert.equal(calls.length, 1);
});
for (const name of ['../secret.md', '%2e%2e%2fsecret.md', '.github/workflows/x.md', 'x/y.md', 'x.md/..', 'x.txt']) {
  test('reject unsafe file ' + name, () => assert.throws(() => postName(name)));
}
test('missing configuration does not permit login', async () => {
  const { worker, calls } = mock();
  assert.equal((await worker.fetch(new Request(env.PUBLIC_ORIGIN + '/api/auth/login'), {})).status, 503); assert.equal(calls.length, 0);
});
test('login uses PKCE and HttpOnly secure state cookie without a broad OAuth scope', async () => {
  const { worker } = mock(); const result = await worker.fetch(new Request(env.PUBLIC_ORIGIN + '/api/auth/login'), env);
  assert.equal(result.status, 302); const target = new URL(result.headers.get('Location'));
  assert.equal(target.origin, 'https://github.com'); assert.equal(target.searchParams.get('code_challenge_method'), 'S256'); assert(target.searchParams.get('state')); assert(!target.searchParams.has('scope'));
  const value = result.headers.get('Set-Cookie'); assert(value.includes('HttpOnly; Secure; SameSite=Lax')); assert(!value.includes(session.token));
});
test('forged OAuth callback is rejected without token exchange', async () => {
  const { worker, calls } = mock();
  assert.equal((await worker.fetch(new Request(env.PUBLIC_ORIGIN + '/api/auth/callback?state=forged&code=bad'), env)).status, 403); assert.equal(calls.length, 0);
});

test('login has no GitHub API dependency and pins the repository before authorization', async () => {
  let calls = 0;
  const worker = createWorker(async () => { calls++; return new Response('{"message":"API rate limit exceeded"}', { status: 403, headers: { 'X-RateLimit-Remaining': '0' } }); });
  const result = await worker.fetch(new Request(env.PUBLIC_ORIGIN + '/api/auth/login'), env);
  assert.equal(result.status, 302); assert.equal(calls, 0);
  const cookie = result.headers.get('Set-Cookie').split(';')[0].split('=')[1];
  const flow = await unseal(cookie, env.SESSION_SECRET, 'blog-writer:' + env.PUBLIC_ORIGIN + ':oauth');
  assert.equal(flow.repoId, REPO_ID);
  assert.equal(new URL(result.headers.get('Location')).origin, 'https://github.com');
});

test('authenticated repository checks never use the shared anonymous GitHub limit', async () => {
  const { worker, calls } = mock();
  assert.equal((await worker.fetch(request('/api/posts'), env)).status, 200);
  const repoCall = calls.find(call => call.url === PREFIX);
  assert.equal(repoCall.headers.Authorization, 'Bearer ' + session.token);
});

test('a different repository ID fails closed before reading contents', async () => {
  const { worker, calls } = mock({ repoId: REPO_ID + 1 });
  assert.equal((await worker.fetch(request('/api/posts'), env)).status, 403);
  assert.equal(calls.length, 1);
});

for (const options of [{}, { private: true }, { id: REPO_ID + 1 }]) {
  test('OAuth callback validates authenticated owner and repository before creating a session ' + JSON.stringify(options), async () => {
    const calls = [];
    const worker = createWorker(async (url, init) => {
      calls.push(url);
      if (url === 'https://github.com/login/oauth/access_token') {
        assert.equal(JSON.parse(init.body).repository_id, String(REPO_ID));
        assert(JSON.parse(init.body).code_verifier);
        return response({ access_token: session.token, expires_in: 7200 });
      }
      assert.equal(init.headers.Authorization, 'Bearer ' + session.token);
      if (url === 'https://api.github.com/user') return response({ id: OWNER_ID, login: OWNER });
      if (url === PREFIX) return response({ id: options.id || REPO_ID, private: Boolean(options.private), visibility: options.private ? 'private' : 'public', full_name: `${OWNER}/Okazaki-Yumemi.github.io`, owner: { id: OWNER_ID }, default_branch: 'main' });
      if (url === PREFIX + '/contents/public-images.json?ref=main') return response(file('["bg1.png"]'));
      throw new Error('Unexpected URL');
    });
    const login = await worker.fetch(new Request(env.PUBLIC_ORIGIN + '/api/auth/login'), env);
    const state = new URL(login.headers.get('Location')).searchParams.get('state');
    const callback = await worker.fetch(new Request(env.PUBLIC_ORIGIN + '/api/auth/callback?code=fake-code&state=' + state, { headers: { Cookie: login.headers.get('Set-Cookie').split(';')[0] } }), env);
    const allowed = !options.private && !options.id;
    assert.equal(callback.status, allowed ? 303 : 403);
    assert.equal(calls.length, allowed ? 4 : 3);
    assert.equal(Boolean(callback.headers.get('Set-Cookie')?.includes('__Host-blog-session=')), allowed);
  });
}

for (const item of [
  { status: 403, headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '120' }, expected: 429, retry: '120' },
  { status: 403, headers: {}, message: 'You have exceeded a secondary rate limit', expected: 429, retry: '60' },
  { status: 429, headers: {}, expected: 429, retry: '60' },
  { status: 403, headers: {}, expected: 403 },
  { status: 503, headers: {}, expected: 502 }
]) {
  test('GitHub error classification does not confuse rate limits with permissions ' + JSON.stringify(item), async () => {
    const worker = createWorker(async () => new Response(JSON.stringify({ message: item.message || 'upstream-secret-info' }), { status: item.status, headers: item.headers }));
    const result = await worker.fetch(request('/api/posts'), env);
    assert.equal(result.status, item.expected);
    const body = await result.text(); assert(!body.includes('upstream-secret-info')); assert(!body.includes(session.token));
    if (item.retry) { assert.equal(result.headers.get('Retry-After'), item.retry); assert(body.includes('限流')); }
  });
}
test('publish creates a single non-force commit containing only the article', async () => {
  const { worker, calls } = mock(); const result = await worker.fetch(request('/api/publish', base), env);
  assert.equal(result.status, 201, await result.clone().text());
  const tree = calls.find(x => x.url.endsWith('/git/trees')).parsed;
  assert.deepEqual(tree.tree.map(x => x.path), ['source/_posts/new-note.md']);
  const ref = calls.find(x => x.url.endsWith('/git/refs/heads/main')).parsed; assert.equal(ref.force, false);
  assert.equal(calls.filter(x => x.url.endsWith('/git/commits')).length, 1);
  const body = await result.json(); assert(!JSON.stringify(body).includes(session.token));
});
test('existing article edit preserves permalink, original date and custom YAML', async () => {
  const content = makePost({ ...base, body: '    indented code\n' }, splitPost(source), '/images/bg1.png');
  const result = splitPost(content);
  assert.equal(result.metadata.permalink, 'old-url.html'); assert.equal(result.metadata.date, '2026-01-01 10:00:00'); assert.equal(result.metadata.custom, '保留'); assert(result.body.startsWith('    indented'));
});
test('stale article cannot overwrite a newer edit', async () => {
  const { worker, calls } = mock();
  assert.equal((await worker.fetch(request('/api/publish', { ...base, name: 'old.md', baseSha: 'stale-sha' }), env)).status, 409);
  assert(!calls.some(x => x.method === 'POST'));
});
test('branch race is surfaced as conflict, not success', async () => {
  const { worker } = mock({ race: true }); assert.equal((await worker.fetch(request('/api/publish', base), env)).status, 409);
});
test('rejects non-allowlisted cover and dangerous SVG uploads', async () => {
  const { worker } = mock();
  assert.equal((await worker.fetch(request('/api/publish', { ...base, cover: '/images/private.jpg' }), env)).status, 400);
  assert.throws(() => validateUpload({ data: btoa('<svg onload="alert(1)"></svg>') }));
  assert(!approvedImage('../private.jpg')); assert(!approvedImage('bgm.mp3')); assert(!approvedImage('x.svg'));
});
test('cover, whitelist and post are committed atomically', async () => {
  const bytes = new Uint8Array(20); bytes.set(new TextEncoder().encode('RIFF')); new DataView(bytes.buffer).setUint32(4, 12, true); bytes.set(new TextEncoder().encode('WEBPVP8 '), 8);
  const { worker, calls } = mock(); const result = await worker.fetch(request('/api/publish', { ...base, upload: { data: encode64(bytes) } }), env);
  assert.equal(result.status, 201, await result.clone().text());
  const tree = calls.find(x => x.url.endsWith('/git/trees')).parsed.tree;
  assert.equal(tree.length, 3); assert(tree[0].path.startsWith('images/covers/upload-')); assert.equal(tree[1].path, 'public-images.json'); assert.equal(tree[2].path, 'source/_posts/new-note.md');
  assert.equal(calls.filter(x => x.url.endsWith('/git/commits')).length, 1);
});
test('reserved URLs and empty content are rejected', () => {
  for (const value of [{ slug: 'index' }, { slug: '../x' }, { body: '' }, { title: '' }, { title: 'a\nb' }]) assert.throws(() => makePost({ ...base, ...value }, null, base.cover));
});
test('unapproved repository references fail before commit without accessing those repositories', async () => {
  const { worker, calls } = mock();
  const result = await worker.fetch(request('/api/publish', { ...base, body: 'https://github.com/Okazaki-Yumemi/not-approved' }), env);
  assert.equal(result.status, 400); assert(!calls.some(x => x.method === 'POST'));
  assert(calls.every(x => x.url.startsWith(PREFIX)));
});
