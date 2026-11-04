'use strict';

// Enhance the generated theme markup without changing the installed theme.
const { load } = require('cheerio');
hexo.extend.filter.register('after_render:html', function (html) {
  if (!html.includes('id="page-header"')) return html;
  const $ = load(html);
  $('body').addClass('editorial');
  $('.nav-site-title .site-name').text('Hidden Space');
  $('.nav-site-title').attr('aria-label', "YMGFC_CN's Hidden Space · 首页");
  if ($('#page-header.full_page').length) {
    $('body').addClass('editorial-home');
    $('#site-info').prepend('<div class="editorial-kicker"><span></span> YMGFC_CN’S JOURNAL · 记录与探索</div>');
    $('#site-title').html('让好奇心，<br>有处<span class="editorial-emphasis">安放。</span>');
    $('#site-subtitle').before('<p class="editorial-intro">在代码与文字之间，收集值得留下的片刻。<br>关于技术、创造，以及天马行空的灵感。</p>');
    $('#site-info').append('<div class="editorial-actions"><a class="editorial-primary" href="#recent-posts">开始阅读 <span aria-hidden="true">↗</span></a><a href="/projects/">探索项目 <span aria-hidden="true">→</span></a></div>');
    $('#site-info').after('<figure class="editorial-art"><img src="/images/bg1.png" alt="Hidden Space 的幻想世界插画" fetchpriority="high"><figcaption><span>A LITTLE SPACE FOR BIG IDEAS</span><span>灵感，自由生长 ↗</span></figcaption></figure>');
    $('#recent-posts').prepend('<div class="editorial-section"><div><span class="editorial-label">THE JOURNAL / 持续记录</span><h2>最近的思考<span>与发现</span></h2></div><a href="/archives/">全部文章 ↗</a></div><nav class="editorial-topics" aria-label="按主题阅读"><a href="/courses/">01 / 课程笔记</a><a href="/projects/">02 / 项目实践</a><a href="/writing/">03 / 文字随笔</a><a href="/atlas/">04 / 知识图谱</a></nav>');
  }
  return $.html();
});
