import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';
import { createElement, RefreshCw, LogOut } from 'lucide';
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);
for (const el of document.querySelectorAll('[data-icon]')) el.replaceWith(createElement(el.dataset.icon === 'refresh' ? RefreshCw : LogOut, { 'aria-hidden': 'true' }));
const $ = id => document.getElementById(id);
const numbers = value => Number(value || 0).toLocaleString('zh-CN');
let csrf, chart, generation = 0;
const countryNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' });
const country = code => code === 'XX' ? '未知' : countryNames.of(code) || code;
const element = (tag, text) => { const el = document.createElement(tag); el.textContent = text; return el; };
async function api(path) {
  const response = await fetch('/api/' + path, { credentials: 'same-origin' }); const body = await response.json();
  if (!response.ok) throw new Error(body.error || '统计加载失败'); return body;
}
function message(text, error = false) { $('notice').textContent = text; $('notice').hidden = !text; $('notice').classList.toggle('error', error); }
function empty(table, columns) { const row = document.createElement('tr'), cell = element('td', '暂无访问记录'); cell.colSpan = columns; row.append(cell); table.append(row); }
function breakdown(id, rows, transform = value => value) {
  const parent = $(id); parent.replaceChildren();
  for (const row of rows.slice(0, 12)) { const el = document.createElement('div'); el.className = 'dimension'; el.append(element('span', transform(row.value)), element('strong', numbers(row.views))); parent.append(el); }
  if (!rows.length) parent.append(element('span', '暂无访问记录'));
}
async function load() {
  const current = ++generation; $('refresh').disabled = true;
  try {
    const data = await api('analytics?days=' + $('period').value); if (current !== generation) return;
    $('total-views').textContent = numbers(data.totalViews); $('today-views').textContent = numbers(data.todayViews); $('today-visitors').textContent = numbers(data.todayVisitors); $('period-views').textContent = numbers(data.daily.reduce((sum, row) => sum + row.views, 0));
    const labels = [], views = [], visitors = [];
    for (let i = data.days - 1; i >= 0; i--) { const day = new Date(Date.parse(data.today + 'T00:00:00Z') - i * 86400000).toISOString().slice(0, 10); labels.push(day.slice(5)); views.push(data.daily.find(x => x.day === day)?.views || 0); visitors.push(data.visitors.find(x => x.day === day)?.visitors || 0); }
    chart?.destroy(); chart = new Chart($('trend-chart'), { type: 'line', data: { labels, datasets: [{ label: '有效浏览', data: views, borderColor: '#18764b', backgroundColor: '#18764b', borderWidth: 2, pointRadius: 2, tension: .15 }, { label: '访客估计', data: visitors, borderColor: '#c87531', backgroundColor: '#c87531', borderWidth: 2, pointRadius: 2, tension: .15 }] }, options: { maintainAspectRatio: false, animation: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } } });
    const pages = $('top-pages'); pages.replaceChildren();
    for (const page of data.pages) { const row = document.createElement('tr'), cell = document.createElement('td'), link = element('a', page.title); link.href = 'https://okazaki-yumemi.github.io' + page.path; link.target = '_blank'; link.rel = 'noopener noreferrer'; cell.append(link); row.append(cell, element('td', numbers(page.views))); pages.append(row); }
    if (!data.pages.length) empty(pages, 2);
    breakdown('sources', data.dimensions.filter(x => x.kind === 'source')); breakdown('devices', data.dimensions.filter(x => x.kind === 'device')); breakdown('countries', data.dimensions.filter(x => x.kind === 'country'), country);
    const recent = $('recent'); recent.replaceChildren();
    for (const visit of data.recent) {
      const row = document.createElement('tr');
      for (const text of [new Date(visit.at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }), visit.title, country(visit.country), visit.device, visit.source]) row.append(element('td', text));
      recent.append(row);
    }
    if (!data.recent.length) empty(recent, 5);
    $('updated').textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }); message('');
  } catch (error) { message(error.message, true); }
  finally { if (current === generation) $('refresh').disabled = false; }
}
$('refresh').onclick = load; $('period').onchange = load;
$('logout').onclick = async () => { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' }, body: '{}' }); location.reload(); };
try {
  const session = await api('session');
  if (session.user) { csrf = session.csrf; $('identity').textContent = session.user.login; $('login').hidden = true; $('logout').hidden = false; $('stats-main').hidden = false; await load(); }
} catch (error) { message(error.message, true); }
