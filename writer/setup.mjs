import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const configPath = 'writer/wrangler.jsonc';
const config = JSON.parse(await readFile(configPath, 'utf8'));
const origin = new URL(config.vars.PUBLIC_ORIGIN).origin;
if (!origin.startsWith('https://')) throw new Error('Configure a public HTTPS Worker origin first.');
const state = process.argv[2] || randomBytes(32).toString('hex');
if (!/^[a-f0-9]{64}$/.test(state)) throw new Error('Invalid setup state.');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const manifest = {
  name: 'YMGFC Hidden Space Writer', url: origin,
  redirect_url: 'http://localhost:8977/callback',
  callback_urls: [origin + '/api/auth/callback'],
  public: false, default_permissions: { contents: 'write', actions: 'read' },
  default_events: [], hook_attributes: { url: origin + '/api/webhook-disabled', active: false }
};
let running = false;
function cli(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], { cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error('Cloudflare configuration failed; check login and retry.')));
    child.stdin.end(input || '');
  });
}
const server = http.createServer(async (request, response) => {
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Frame-Options', 'DENY');
  const url = new URL(request.url, 'http://localhost:8977');
  if (url.pathname === '/' + state && request.method === 'GET') {
    response.end(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>连接 GitHub</title><h1>连接博客的 GitHub App</h1><p>权限：博客内容读写、构建状态只读。请在下一步只选择 Okazaki-Yumemi.github.io 仓库。</p><form method="post" action="https://github.com/settings/apps/new?state=${state}"><input type="hidden" name="manifest" value="${escape(JSON.stringify(manifest))}"><button type="submit">前往 GitHub 创建 App</button></form></html>`);
    return;
  }
  if (url.pathname !== '/callback' || url.searchParams.get('state') !== state || !/^[a-zA-Z0-9_-]+$/.test(url.searchParams.get('code') || '') || running) { response.writeHead(403); response.end('Forbidden'); return; }
  running = true;
  try {
    const result = await fetch(`https://api.github.com/app-manifests/${url.searchParams.get('code')}/conversions`, { method: 'POST', headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Hidden-Space-Writer-Setup' } });
    if (!result.ok) throw new Error('GitHub registration exchange failed.');
    const app = await result.json();
    if (!app.client_id || !app.client_secret || !app.slug || app.owner?.id !== 259598129) throw new Error('The GitHub App must belong to Okazaki-Yumemi.');
    config.vars.GITHUB_CLIENT_ID = app.client_id;
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    // Secrets travel directly to Wrangler stdin, never into repository files or logs.
    await cli(['secret', 'bulk', '--config', configPath], JSON.stringify({ GITHUB_CLIENT_SECRET: app.client_secret, SESSION_SECRET: randomBytes(48).toString('base64url') }));
    await cli(['deploy', '--config', configPath]);
    const install = `https://github.com/apps/${encodeURIComponent(app.slug)}/installations/new`;
    await mkdir('.preview', { recursive: true });
    await writeFile('.preview/writer-app.json', JSON.stringify({ id: app.id, slug: app.slug, clientId: app.client_id, install, origin }, null, 2));
    response.end(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>安装博客 App</title><h1>密钥已安全写入 Cloudflare</h1><p>请选择 Only select repositories，并且只勾选 Okazaki-Yumemi.github.io，不选择其他或私有仓库。</p><p><a href="${escape(install)}">安装到博客仓库</a></p><p><a href="${origin}">打开写作后台</a></p></html>`);
    console.log('GitHub App connected. Install only on the blog repository: ' + install);
    server.close();
  } catch (error) {
    response.statusCode = 500;
    response.end('设置未完成。请检查 Cloudflare 登录后重新运行 npm run writer:setup；不要把密钥发到聊天或提交到 Git。');
    console.error('Setup did not complete; no secret values were logged.');
    server.close();
    process.exitCode = 1;
  }
});
server.listen(8977, '127.0.0.1', () => {
  console.log(`Open http://localhost:8977/${state}`);
});
setTimeout(() => { console.log('Setup link expired.'); server.close(); }, 20 * 60 * 1000).unref();
