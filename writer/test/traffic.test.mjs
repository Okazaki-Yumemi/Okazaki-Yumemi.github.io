import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createTraffic, localDay, sourceGroup } from '../traffic.mjs';
import { createWorker, seal } from '../worker.mjs';
import { OWNER_ID } from '../content.mjs';
const now = Date.parse('2026-10-22T05:10:00Z');
const origin = 'https://writer.example';
function setup() {
  const db = new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../traffic.sql', import.meta.url), 'utf8'));
  const env = { PUBLIC_ORIGIN: origin, SESSION_SECRET: 'x'.repeat(64), GITHUB_CLIENT_ID: 'fake', GITHUB_CLIENT_SECRET: 'fake', TRAFFIC_LIMITER: { limit: async () => ({ success: true }) } };
  env.TRAFFIC_DB = {
    prepare: sql => ({ sql, args: [], bind(...args) { this.args = args; return this; } }),
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const result = statements.map(({ sql, args }) => {
          const statement = db.prepare(sql);
          if (statement.columns().length) return { results: statement.all(...args), meta: { changes: 0 } };
          const result = statement.run(...args); return { results: [], meta: { changes: Number(result.changes) } };
        });
        db.exec('COMMIT'); return result;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
  };
  const upstream = async url => {
    assert.equal(url, 'https://okazaki-yumemi.github.io/traffic-pages.json');
    return Response.json([{ path: '/', title: '首页' }, { path: '/post-1.html', title: '第一篇' }]);
  };
  const request = headers => {
    const req = new Request(origin + '/api/traffic/collect', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://okazaki-yumemi.github.io', 'CF-Connecting-IP': '192.0.2.123', 'User-Agent': 'Mozilla/5.0 Chrome/123 Safari/537', ...headers }, body: '{}' });
    Object.defineProperty(req, 'cf', { value: { country: 'CN' } }); return req;
  };
  return { db, env, upstream, request, traffic: createTraffic(upstream) };
}
test('SQL collector records a real view without storing raw network identity', async () => {
  const { traffic, env, db, request } = setup();
  assert((await traffic.collect(request(), { path: '/post-1.html', referrer: 'https://www.google.com/search?q=private-query' }, env, now)).recorded);
  const counts = await traffic.count('/post-1.html', env); assert.deepEqual(counts, { total: 1, page: 1 });
  const data = await traffic.summary(7, env, now); assert.equal(data.todayVisitors, 1); assert.equal(data.todayViews, 1); assert.equal(data.recent[0].source, 'Google');
  const dump = JSON.stringify(['visitor_daily', 'visit_guard', 'recent_visits', 'dimension_daily'].map(t => db.prepare(`SELECT * FROM ${t}`).all()));
  for (const secret of ['192.0.2.123', 'Chrome/123', 'private-query', 'google.com/search']) assert(!dump.includes(secret));
  assert.match(db.prepare('SELECT visitor FROM visitor_daily').get().visitor, /^[a-f0-9]{64}$/);
});
test('duplicate and concurrent refreshes count once per half-hour bucket', async () => {
  const { traffic, env, request } = setup();
  const results = await Promise.all([traffic.collect(request(), { path: '/' }, env, now), traffic.collect(request(), { path: '/' }, env, now)]);
  assert.equal(results.filter(x => x.recorded).length, 1); assert.equal((await traffic.count('/', env)).total, 1);
  await traffic.collect(request(), { path: '/' }, env, now + 1800000); assert.equal((await traffic.count('/', env)).total, 2);
});
test('visitor estimate is per day, not per page; daily identifiers rotate', async () => {
  const { traffic, env, db, request } = setup();
  await traffic.collect(request(), { path: '/' }, env, now); await traffic.collect(request(), { path: '/post-1.html' }, env, now);
  assert.equal((await traffic.summary(7, env, now)).todayVisitors, 1);
  await traffic.collect(request(), { path: '/' }, env, now + 86400000);
  const visitors = db.prepare('SELECT visitor FROM visitor_daily').all(); assert.equal(visitors.length, 2); assert.notEqual(visitors[0].visitor, visitors[1].visitor);
});
for (const headers of [{ DNT: '1' }, { 'Sec-GPC': '1' }, { 'User-Agent': 'Googlebot' }, { 'User-Agent': 'HeadlessChrome' }]) {
  test('do not collect privacy opt-outs or bots ' + JSON.stringify(headers), async () => {
    const { traffic, env, db, request } = setup(); assert((await traffic.collect(request(headers), { path: '/' }, env, now)).ignored);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM visitor_daily').get().n, 0);
  });
}
test('rate-limited and unlisted paths do not create analytics records', async () => {
  const { traffic, env, db, request } = setup();
  await assert.rejects(traffic.collect(request(), { path: '/not-published.html' }, env, now));
  await assert.rejects(traffic.collect(request(), { path: '/?password=secret' }, env, now));
  env.TRAFFIC_LIMITER.limit = async () => ({ success: false }); await assert.rejects(traffic.collect(request(), { path: '/' }, env, now));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM page_totals').get().n, 0);
});
test('referrer groups never contain arbitrary hostnames or full query strings', () => {
  assert.equal(sourceGroup('https://www.google.com/search?q=x'), 'Google');
  assert.equal(sourceGroup('https://google.com.attacker.invalid/private'), '其他外链');
  assert.equal(sourceGroup('https://internal-personal-host/private?q=secret'), '其他外链');
});
test('cleanup drops old details but preserves aggregate lifetime views', async () => {
  const { traffic, env, db, request } = setup();
  await traffic.collect(request(), { path: '/' }, env, now - 95 * 86400000); await traffic.collect(request(), { path: '/' }, env, now);
  await traffic.cleanup(env, now);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM visitor_daily').get().n, 1); assert.equal(db.prepare('SELECT COUNT(*) AS n FROM recent_visits').get().n, 1); assert.equal((await traffic.count('/', env)).total, 2);
});
test('anonymous users cannot read visitor details; public endpoint exposes only counts', async () => {
  const { upstream, env } = setup(); const worker = createWorker(upstream);
  assert.equal((await worker.fetch(new Request(origin + '/api/analytics'), env)).status, 401);
  const result = await worker.fetch(new Request(origin + '/api/traffic/count?path=/'), env);
  assert.deepEqual(Object.keys(await result.json()).sort(), ['page', 'total']);
});
test('only the site gets collection CORS, not arbitrary origins', async () => {
  const { upstream, env } = setup(); const worker = createWorker(upstream);
  const allowed = await worker.fetch(new Request(origin + '/api/traffic/collect', { method: 'OPTIONS', headers: { Origin: 'https://okazaki-yumemi.github.io' } }), env);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'https://okazaki-yumemi.github.io');
  const denied = await worker.fetch(new Request(origin + '/api/traffic/collect', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env);
  assert.equal(denied.status, 403); assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);
});
test('authenticated owner can read analytics without exposing internal hashes', async () => {
  const { upstream, env, traffic, request } = setup(); await traffic.collect(request(), { path: '/' }, env, now);
  const value = await seal({ id: OWNER_ID, token: 'fake', csrf: 'fake', exp: Date.now() + 60000 }, env.SESSION_SECRET, `blog-writer:${origin}:session`);
  const result = await createWorker(upstream).fetch(new Request(origin + '/api/analytics?days=7', { headers: { Cookie: '__Host-blog-session=' + value } }), env);
  assert.equal(result.status, 200); const body = await result.json(); assert(!JSON.stringify(body).includes('192.0.2.123')); assert(!('visitor' in (body.recent[0] || {})));
});
test('day boundaries follow Asia/Shanghai', () => { assert.equal(localDay(Date.parse('2026-10-21T16:01:00Z')), '2026-10-22'); });
