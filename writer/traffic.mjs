import { SITE, requireValue } from './content.mjs';
const DAY = 86400000;
const encoder = new TextEncoder();
export const localDay = now => new Date(now + 8 * 3600000).toISOString().slice(0, 10);
export const validPath = path => typeof path === 'string' && path.length <= 180 && /^\/(?:[a-zA-Z0-9_-]+\/|[a-zA-Z0-9_-]+\.html)?$/.test(path);
export function device(ua) {
  if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) return '平板';
  return /mobile|iphone|ipod/i.test(ua) ? '手机' : '电脑';
}
export function sourceGroup(referrer) {
  if (!referrer) return '直接访问';
  let host;
  try { const url = new URL(referrer); if (!['http:', 'https:'].includes(url.protocol)) return '其他外链'; host = url.hostname.toLowerCase(); }
  catch { return '其他外链'; }
  const match = domain => host === domain || host.endsWith('.' + domain);
  if (host === new URL(SITE).hostname) return '站内跳转';
  for (const [domain, name] of [['google.com', 'Google'], ['bing.com', 'Bing'], ['baidu.com', '百度'], ['github.com', 'GitHub'], ['bilibili.com', 'Bilibili'], ['zhihu.com', '知乎'], ['weibo.com', '微博'], ['t.co', 'X'], ['x.com', 'X'], ['source.sjtu.edu.cn', '水源'], ['qq.com', 'QQ / 微信']]) if (match(domain)) return name;
  return '其他外链';
}
export async function digest(secret, message) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode('blog-traffic:v1:' + message)))].map(x => x.toString(16).padStart(2, '0')).join('');
}
export function createTraffic(upstream = fetch) {
  let pages = null, loaded = 0;
  async function manifest() {
    if (pages && Date.now() - loaded < 60000) return pages;
    const response = await upstream(SITE + '/traffic-pages.json', { signal: AbortSignal.timeout(8000) });
    requireValue(response.ok, '页面目录尚未同步', 503);
    const list = await response.json();
    requireValue(Array.isArray(list) && list.length <= 10000, '页面目录不可用', 503);
    pages = new Map(list.filter(x => validPath(x.path) && typeof x.title === 'string').map(x => [x.path, x.title.slice(0, 180)])); loaded = Date.now();
    return pages;
  }
  async function count(path, env) {
    requireValue(validPath(path), '页面地址不合法');
    const [total, page] = await env.TRAFFIC_DB.batch([
      env.TRAFFIC_DB.prepare('SELECT COALESCE(SUM(views),0) AS count FROM page_totals'),
      env.TRAFFIC_DB.prepare('SELECT views AS count FROM page_totals WHERE path=?').bind(path)
    ]);
    return { total: total.results[0]?.count || 0, page: page.results[0]?.count || 0 };
  }
  async function collect(request, input, env, now = Date.now()) {
    if (request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1') return { ignored: true };
    const ua = request.headers.get('User-Agent') || '';
    if (/bot\b|crawler|spider|headless|preview|slurp|lighthouse/i.test(ua) || !ua) return { ignored: true };
    requireValue(input && validPath(input.path), '页面地址不合法');
    const ip = request.headers.get('CF-Connecting-IP');
    requireValue(ip && env.SESSION_SECRET && env.TRAFFIC_LIMITER, '统计服务暂不可用', 503);
    const day = localDay(now), client = device(ua);
    const browser = /edg\//i.test(ua) ? 'edge' : /firefox\//i.test(ua) ? 'firefox' : /chrome\//i.test(ua) ? 'chrome' : /safari\//i.test(ua) ? 'safari' : 'other';
    const visitor = await digest(env.SESSION_SECRET, `visitor|${day}|${ip}|${client}|${browser}`);
    requireValue((await env.TRAFFIC_LIMITER.limit({ key: visitor })).success, '访问过于频繁', 429);
    requireValue((await manifest()).has(input.path), '不记录未发布页面', 400);
    const key = await digest(env.SESSION_SECRET, `view|${visitor}|${input.path}|${Math.floor(now / 1800000)}`);
    const nonce = crypto.randomUUID(), country = /^[A-Z]{2}$/.test(request.cf?.country || '') ? request.cf.country : 'XX';
    const source = sourceGroup(typeof input.referrer === 'string' ? input.referrer.slice(0, 2048) : '');
    const at = new Date(Math.floor(now / 60000) * 60000).toISOString();
    const condition = 'EXISTS(SELECT 1 FROM visit_guard WHERE key=? AND nonce=?)';
    const statements = [
      env.TRAFFIC_DB.prepare('INSERT INTO visit_guard(key,nonce,expires) VALUES(?,?,?) ON CONFLICT DO NOTHING').bind(key, nonce, now + 3600000),
      env.TRAFFIC_DB.prepare(`INSERT INTO page_totals(path,views) SELECT ?,1 WHERE ${condition} ON CONFLICT(path) DO UPDATE SET views=views+1`).bind(input.path, key, nonce),
      env.TRAFFIC_DB.prepare(`INSERT INTO page_daily(day,path,views) SELECT ?,?,1 WHERE ${condition} ON CONFLICT(day,path) DO UPDATE SET views=views+1`).bind(day, input.path, key, nonce),
      env.TRAFFIC_DB.prepare(`INSERT INTO visitor_daily(day,visitor) SELECT ?,? WHERE ${condition} ON CONFLICT DO NOTHING`).bind(day, visitor, key, nonce),
      env.TRAFFIC_DB.prepare(`INSERT INTO recent_visits(at,path,country,device,source) SELECT ?,?,?,?,? WHERE ${condition}`).bind(at, input.path, country, client, source, key, nonce)
    ];
    for (const [kind, value] of [['country', country], ['device', client], ['source', source]]) statements.push(env.TRAFFIC_DB.prepare(`INSERT INTO dimension_daily(day,kind,value,views) SELECT ?,?,?,1 WHERE ${condition} ON CONFLICT(day,kind,value) DO UPDATE SET views=views+1`).bind(day, kind, value, key, nonce));
    const result = await env.TRAFFIC_DB.batch(statements);
    return { recorded: Boolean(result[0].meta?.changes) };
  }
  async function summary(days, env, now = Date.now()) {
    requireValue([7, 30, 90].includes(days), '时间范围不合法');
    const today = localDay(now), since = new Date(Date.parse(today + 'T00:00:00Z') - (days - 1) * DAY).toISOString().slice(0, 10);
    const queries = [
      ['SELECT COALESCE(SUM(views),0) AS count FROM page_totals', []],
      ['SELECT COALESCE(SUM(views),0) AS count FROM page_daily WHERE day=?', [today]],
      ['SELECT COUNT(*) AS count FROM visitor_daily WHERE day=?', [today]],
      ['SELECT day,SUM(views) AS views FROM page_daily WHERE day>=? GROUP BY day ORDER BY day', [since]],
      ['SELECT day,COUNT(*) AS visitors FROM visitor_daily WHERE day>=? GROUP BY day ORDER BY day', [since]],
      ['SELECT path,SUM(views) AS views FROM page_daily WHERE day>=? GROUP BY path ORDER BY views DESC LIMIT 20', [since]],
      ['SELECT kind,value,SUM(views) AS views FROM dimension_daily WHERE day>=? GROUP BY kind,value ORDER BY views DESC', [since]],
      ['SELECT at,path,country,device,source FROM recent_visits ORDER BY id DESC LIMIT 50', []]
    ];
    const results = await env.TRAFFIC_DB.batch(queries.map(([sql, args]) => env.TRAFFIC_DB.prepare(sql).bind(...args)));
    let titles = new Map(); try { titles = await manifest(); } catch {}
    const titled = rows => rows.map(row => ({ ...row, title: titles.get(row.path) || row.path }));
    return { days, today, totalViews: results[0].results[0]?.count || 0, todayViews: results[1].results[0]?.count || 0, todayVisitors: results[2].results[0]?.count || 0, daily: results[3].results, visitors: results[4].results, pages: titled(results[5].results), dimensions: results[6].results, recent: titled(results[7].results) };
  }
  async function cleanup(env, now = Date.now()) {
    if (!env.TRAFFIC_DB) return;
    const before = localDay(now - 89 * DAY), recent = new Date(now - 30 * DAY).toISOString();
    await env.TRAFFIC_DB.batch([
      env.TRAFFIC_DB.prepare('DELETE FROM visit_guard WHERE expires<?').bind(now),
      env.TRAFFIC_DB.prepare('DELETE FROM recent_visits WHERE at<?').bind(recent),
      ...['page_daily', 'visitor_daily', 'dimension_daily'].map(table => env.TRAFFIC_DB.prepare(`DELETE FROM ${table} WHERE day<?`).bind(before))
    ]);
  }
  return { count, collect, summary, cleanup };
}
