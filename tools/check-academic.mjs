import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from 'cheerio';
const base='public/research/';
for(const page of ['','manuscripts/','projects/','writing/','contact/']){
 const html=fs.readFileSync(base+page+'index.html','utf8');const $=load(html);
 assert.equal($('html').attr('lang'),'en');
 assert.equal($('nav a[href="/"]').length,0);
 assert.equal($('link[rel=canonical]').length,1);
 assert(!/REIMU|SpecterHybrid|SpeQuit|FP32|Numerical|Stability|When Cache State/i.test(html));
 assert(!/\.pdf|arxiv|doi\.org/.test(html));
 for(const a of $('a[href]').toArray())assert(!$(a).attr('href').startsWith('//'));
}
const $=load(fs.readFileSync(base+'index.html','utf8'));
assert.equal($('.projects article').length,4);assert.equal($('.note').length,2);
assert.deepEqual($('.note a').toArray().map(a=>$(a).attr('href')),['/deepinfer2.html','/deepinfer1.html']);
assert.match($('.status').text(),/Manuscript under review, 2026/);
assert.match(fs.readFileSync(base+'contact/index.html','utf8'),/lpr2333@sjtu.edu.cn/);
console.log('Academic: 5 pages; privacy, status, selection, SEO and link checks passed.');
