'use strict';

const fs = require('node:fs');
const path = require('node:path');

const base = '/research/';
const assets = '/assets/research/';
const portrait = assets + 'portrait.jpg';
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function renderSection(id, title, content, action = '') {
  return `<section id="${id}" aria-labelledby="${id}-title">
    <div class="section-heading">
      <h2 id="${id}-title">${escapeHtml(title)}</h2>
      ${action}
    </div>
    ${content}
  </section>`;
}

function renderProfile(profile) {
  const { lab, advisors } = profile;
  const advisorList = advisors.map(advisor => {
    const name = escapeHtml(advisor.name);
    const link = advisor.url ? `<a href="${escapeHtml(advisor.url)}">${name}</a>` : name;
    return `<li>${link}</li>`;
  }).join('');

  return `<aside class="profile" aria-label="Profile">
    <img class="portrait" src="${portrait}" width="500" height="500"
      alt="Portrait of ${escapeHtml(profile.name)}">
    <div class="profile-body">
      <h1>${escapeHtml(profile.name)} <span lang="zh-CN">${escapeHtml(profile.chineseName)}</span></h1>
      <p class="role">${escapeHtml(profile.role)}</p>
      <p class="affiliation">${escapeHtml(profile.institution)}</p>
      <ul class="profile-links">
        <li><a href="mailto:${escapeHtml(profile.email)}">Email</a></li>
        <li><a href="${escapeHtml(profile.github)}">GitHub <span aria-hidden="true">↗</span></a></li>
        ${profile.cv ? `<li><a href="${escapeHtml(profile.cv)}">CV (PDF)</a></li>` : ''}
      </ul>
    </div>
    <div class="affiliations">
      <a class="lab" href="${escapeHtml(lab.url)}">
        <img class="lab-emblem" src="${escapeHtml(lab.emblem)}" width="350" height="350" alt="">
        <span><strong>${escapeHtml(lab.shortName)}</strong>
        <span class="lab-name">${escapeHtml(lab.name)}</span></span>
      </a>
      <p class="lab-role">${escapeHtml(lab.role)}</p>
      <div class="advisors">
        <h2>Advisors</h2>
        <ul>${advisorList}</ul>
      </div>
    </div>
  </aside>`;
}

function renderManuscripts(manuscripts) {
  return manuscripts.map(paper => `<article class="paper">
    <h3>${escapeHtml(paper.title)}</h3>
    <p class="authors">${escapeHtml(paper.authors)}</p>
    <p class="status">${escapeHtml(paper.status)}</p>
    <p>${escapeHtml(paper.summary)}</p>
  </article>`).join('');
}

function renderProjects(projects, github) {
  return `<div class="projects">${projects.map(project => `<article>
    <div class="project-heading">
      <h3><a href="${escapeHtml(github)}/${escapeHtml(encodeURIComponent(project.name))}">${escapeHtml(project.name)}
        <span aria-hidden="true">↗</span></a></h3>
      <span class="project-kind">${escapeHtml(project.kind)}</span>
    </div>
    <p>${escapeHtml(project.summary)}</p>
    <p class="project-meta">${escapeHtml(project.tech)}<br>${escapeHtml(project.status)}</p>
  </article>`).join('')}</div>`;
}

function renderWriting(permalinks, posts) {
  const published = new Map(posts.filter(post => post.published).map(post => [
    new URL(post.permalink).pathname, post
  ]));
  return `<div class="writing-list">${permalinks.map(permalink => {
    const href = '/' + permalink;
    const post = published.get(href);
    if (!post) throw new Error('Missing academic writing: ' + permalink);
    const date = post.date.format('YYYY-MM-DD');
    return `<article class="note">
      <time datetime="${date}">${date}</time>
      <h3><a href="${escapeHtml(href)}">${escapeHtml(post.title)}</a></h3>
    </article>`;
  }).join('')}</div>`;
}

function renderContact(profile) {
  return `<dl class="contact-list">
    <dt>Email</dt><dd><a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a></dd>
    <dt>GitHub</dt><dd><a href="${escapeHtml(profile.github)}">@${escapeHtml(new URL(profile.github).pathname.slice(1))}</a></dd>
  </dl>`;
}

hexo.extend.generator.register('academic', function (locals) {
  const profile = JSON.parse(fs.readFileSync(path.join(hexo.source_dir, '_data/academic.json'), 'utf8'));
  const nav = [
    ['About', 'about'],
    ['Research', 'research'],
    ['Projects', 'projects'],
    ['Writing', 'writing'],
    ['Contact', 'contact']
  ];
  const research = renderSection('research', 'Research Interests',
    `<ul class="interests">${profile.interests.map(interest => `<li>${escapeHtml(interest)}</li>`).join('')}</ul>`);
  const manuscripts = renderSection('manuscripts', 'Manuscripts', renderManuscripts(profile.manuscripts));
  const projects = renderSection('projects', 'Projects', renderProjects(profile.projects, profile.github));
  const writing = renderSection('writing', 'Writing', renderWriting(profile.writing, locals.posts.toArray()));
  const contact = renderSection('contact', 'Contact', renderContact(profile));
  const about = renderSection('about', 'About Me', `<p>${escapeHtml(profile.statement)}</p>`);
  const selected = renderSection('projects', 'Selected Projects',
    renderProjects(profile.projects.filter(project => project.selected), profile.github),
    `<a class="section-link" href="${base}projects/">All projects <span aria-hidden="true">→</span></a>`);

  const pages = [
    { slug: '', title: `${profile.name} | Academic Homepage`, content: about + research + manuscripts + selected + writing + contact },
    { slug: 'manuscripts/', title: `Manuscripts | ${profile.name}`, content: manuscripts },
    { slug: 'projects/', title: `Projects | ${profile.name}`, content: projects },
    { slug: 'writing/', title: `Writing | ${profile.name}`, content: writing },
    { slug: 'contact/', title: `Contact | ${profile.name}`, content: contact }
  ];

  return pages.map(({ slug, title, content }) => {
    const canonical = new URL(base + slug, hexo.config.url).href;
    const navigation = nav.map(([label, anchor]) => {
      const href = slug ? base + '#' + anchor : '#' + anchor;
      return `<a href="${href}">${label}</a>`;
    }).join('');
    return {
      path: (base + slug).slice(1) + 'index.html',
      data: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(profile.statement)}">
  <meta name="author" content="${escapeHtml(profile.name)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(profile.statement)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(new URL(portrait, hexo.config.url).href)}">
  <link rel="icon" href="${escapeHtml(hexo.theme.config.favicon)}">
  <link rel="stylesheet" href="${assets}academic.css">
  <script src="${assets}theme.js" defer></script>
</head>
<body id="top">
  <a class="skip" href="#main">Skip to content</a>
  <header class="masthead">
    <div class="masthead-inner">
      <a class="wordmark" href="${base}">${escapeHtml(profile.name)}</a>
      <nav aria-label="Academic navigation">${navigation}</nav>
      <button id="theme" class="theme-toggle" type="button" aria-label="Dark mode" aria-pressed="false" hidden>
        <span aria-hidden="true">◐</span>
      </button>
    </div>
  </header>
  <div class="layout">
    ${renderProfile(profile)}
    <main id="main">
      ${content}
      <footer>
        <span>${escapeHtml(profile.name)} · ${escapeHtml(profile.institution)}</span>
        <a href="#top">Back to top <span aria-hidden="true">↑</span></a>
      </footer>
    </main>
  </div>
</body>
</html>`
    };
  });
});
