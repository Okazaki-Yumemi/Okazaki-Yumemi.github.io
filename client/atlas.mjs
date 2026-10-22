import { forceSimulation, forceManyBody, forceLink, forceCollide, forceX, forceY } from 'd3-force';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import { graphData, searchPosts } from './core.mjs';

const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
function button(icon, label, callback) { const node = el('button', null, 'tech-icon'); node.type = 'button'; node.title = label; node.setAttribute('aria-label', label); const glyph = el('i', null, 'fas fa-' + icon); glyph.setAttribute('aria-hidden', 'true'); node.append(glyph); node.onclick = callback; return node; }
const color = post => post.categories.includes('课程') ? '#248b72' : post.categories.includes('项目') ? '#d4803f' : '#597ac8';
const radius = node => node.kind === 'post' ? 22 : 9 + Math.min(7, node.count);
const label = node => node.kind === 'tag' ? node.label : node.label.replace(/^【暂时AIGC占位】\s*/, '').slice(0, 22);
export function mountAtlas(root, posts) {
  root.replaceChildren();
  const toolbar = el('div', null, 'atlas-toolbar'), filters = el('div', null, 'atlas-filters'), search = el('input'), tag = el('select');
  search.type = 'search'; search.placeholder = '搜索文章或标签'; search.setAttribute('aria-label', '搜索图谱');
  tag.setAttribute('aria-label', '筛选标签');
  for (const name of ['', ...new Set(posts.flatMap(post => post.tags))].sort((a,b) => a.localeCompare(b, 'zh-CN'))) { const option = el('option', name || '全部标签'); option.value = name; tag.append(option); }
  const controls = el('div', null, 'atlas-controls'), count = el('span', '', 'atlas-count'); count.setAttribute('role', 'status');
  filters.append(search, tag); toolbar.append(filters, controls); root.append(toolbar);
  const stage = el('div', null, 'atlas-stage'), canvas = el('canvas'); canvas.tabIndex = 0; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', '文章与标签关系图'); stage.append(canvas);
  const legend = el('div', null, 'atlas-legend');
  for (const [name, type] of [['课程', 'course'], ['项目', 'project'], ['文章', 'article'], ['标签', 'tag']]) legend.append(el('span', name, 'legend-' + type));
  legend.append(count); stage.append(legend); root.append(stage);
  const inspector = el('div', null, 'atlas-inspector'), detail = el('section', null, 'atlas-detail'), list = el('section', null, 'atlas-post-list'); inspector.append(detail, list); root.append(inspector);
  const ctx = canvas.getContext('2d'), images = new Map();
  let width = 1, height = 1, transform = zoomIdentity, graph, simulation, selected, hovered, frame = 0;
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const drawLater = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); }); };
  const getImage = post => {
    if (!images.has(post.cover)) { const image = new Image(); image.src = post.cover; image.onload = drawLater; images.set(post.cover, image); }
    return images.get(post.cover);
  };
  function draw() {
    if (!graph) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    const ratio = Math.min(devicePixelRatio || 1, 2); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
    ctx.translate(transform.x, transform.y); ctx.scale(transform.k, transform.k);
    const active = hovered || selected, adjacent = new Set(active ? [active.id] : []);
    if (active) for (const edge of graph.links) if (edge.source === active || edge.target === active) { adjacent.add(edge.source.id); adjacent.add(edge.target.id); }
    for (const edge of graph.links) {
      const highlighted = active && (edge.source === active || edge.target === active);
      ctx.strokeStyle = highlighted ? '#248b72' : dark ? '#a7bfcb' : '#8cabb7'; ctx.globalAlpha = active ? highlighted ? .85 : .12 : .34; ctx.lineWidth = (highlighted ? 1.6 : .8) / transform.k;
      ctx.beginPath(); ctx.moveTo(edge.source.x, edge.source.y); ctx.lineTo(edge.target.x, edge.target.y); ctx.stroke();
    }
    for (const node of graph.nodes) {
      const r = radius(node); ctx.globalAlpha = active && !adjacent.has(node.id) ? .25 : 1;
      ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI); ctx.fillStyle = node.kind === 'post' ? color(node.post) : dark ? '#304f53' : '#e1efec'; ctx.fill();
      if (node.kind === 'post') {
        const image = getImage(node.post);
        if (image.complete && image.naturalWidth) {
          ctx.save(); ctx.clip();
          const side = Math.min(image.naturalWidth, image.naturalHeight); ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, node.x-r, node.y-r, r*2, r*2); ctx.restore();
        }
      }
      ctx.strokeStyle = node.kind === 'post' ? color(node.post) : '#53998e'; ctx.lineWidth = (node === active ? 3 : 1.5) / transform.k; ctx.stroke();
      if (node === active || node.kind === 'tag' && (node.count > 1 || transform.k > .65)) {
        ctx.font = `${node.kind === 'tag' ? '600' : '400'} ${node.kind === 'tag' ? 11 / Math.max(.6, transform.k) : 10 / Math.max(.6, transform.k)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const text = label(node); const y = node.kind === 'tag' ? node.y : node.y + r + 13;
        ctx.lineWidth = 4; ctx.strokeStyle = dark ? '#1c2426' : '#f9fcfb'; ctx.strokeText(text, node.x, y); ctx.fillStyle = dark ? '#e1e9e7' : '#2b4142'; ctx.fillText(text, node.x, y);
      }
    }
    ctx.globalAlpha = 1;
  }
  function findAt(x, y) { if (!graph) return null; const [gx, gy] = transform.invert([x, y]); return [...graph.nodes].reverse().find(node => Math.hypot(node.x-gx, node.y-gy) < radius(node) + 5 / transform.k); }
  const zoomer = zoom().scaleExtent([.18, 3]).filter(event => (!event.ctrlKey || event.type === 'wheel') && !event.button && !(event.type === 'mousedown' && findAt(event.offsetX, event.offsetY))).on('zoom', event => { transform = event.transform; drawLater(); });
  select(canvas).call(zoomer).on('dblclick.zoom', null);
  select(canvas).call(drag().touchable(() => false).clickDistance(6).subject(event => { const node = findAt(event.x, event.y); if (!node) return null; const point = transform.apply([node.x, node.y]); return { node, x: point[0], y: point[1] }; }).on('start', event => { event.subject.node.fx = event.subject.node.x; event.subject.node.fy = event.subject.node.y; }).on('drag', event => { const [x,y] = transform.invert([event.x, event.y]); Object.assign(event.subject.node, { fx: x, fy: y, x, y }); drawLater(); }).on('end', event => { event.subject.node.fx = event.subject.node.fy = null; if (!paused) simulation.alpha(.15).restart(); }));
  canvas.addEventListener('mousemove', event => { hovered = findAt(event.offsetX, event.offsetY); canvas.style.cursor = hovered ? 'grab' : 'move'; canvas.title = hovered?.label || ''; drawLater(); });
  canvas.addEventListener('mouseleave', () => { hovered = null; drawLater(); });
  canvas.addEventListener('click', event => { const bounds = canvas.getBoundingClientRect(); const node = findAt(event.clientX-bounds.left, event.clientY-bounds.top); if (node) inspect(node); });
  function fit() {
    if (!graph?.nodes.length) return;
    const xs = graph.nodes.map(n => n.x), ys = graph.nodes.map(n => n.y);
    const minX = Math.min(...xs) - 90, maxX = Math.max(...xs) + 90, minY = Math.min(...ys) - 50, maxY = Math.max(...ys) + 50;
    const plotHeight = height - (width < 600 ? 90 : 55);
    const scale = Math.max(.18, Math.min(1.4, (width-32)/(maxX-minX), (plotHeight-16)/(maxY-minY)));
    select(canvas).call(zoomer.transform, zoomIdentity.translate(width/2, plotHeight/2).scale(scale).translate(-(minX+maxX)/2, -(minY+maxY)/2));
  }
  const pause = button(paused ? 'play' : 'pause', paused ? '继续图谱运动' : '暂停图谱运动', () => {
    paused = !paused; pause.setAttribute('aria-pressed', String(paused)); const title = paused ? '继续图谱运动' : '暂停图谱运动'; pause.title = title; pause.setAttribute('aria-label', title); pause.querySelector('i').className = 'fas fa-' + (paused ? 'play' : 'pause'); if (paused) simulation.stop(); else simulation.alpha(.2).restart();
  }); pause.setAttribute('aria-pressed', String(paused));
  controls.append(button('plus', '放大图谱', () => select(canvas).call(zoomer.scaleBy, 1.3)), button('minus', '缩小图谱', () => select(canvas).call(zoomer.scaleBy, 1/1.3)), button('expand', '适应窗口', fit), pause);
  function listPosts(entries, title) {
    list.replaceChildren(el('h2', title)); const options = el('div', null, 'atlas-article-options');
    for (const post of entries) { const node = graph.nodes.find(n => n.id === post.path); const choice = el('button', post.title, 'atlas-article-option'); choice.type = 'button'; choice.setAttribute('aria-pressed', String(selected?.id === post.path)); choice.onclick = () => inspect(node); options.append(choice); }
    list.append(options);
  }
  function inspect(node, fromUser = true) {
    if (!node) return; selected = fromUser ? node : null; detail.replaceChildren();
    if (node.kind === 'post') {
      const post = node.post, image = el('img'); image.src = post.cover; image.alt = ''; image.width = 320; image.height = 180;
      detail.append(image, el('p', post.categories.join(' / ') + ' · ' + post.minutes + ' 分钟', 'atlas-meta'), el('h2', post.title), el('p', post.description));
      const link = el('a', '阅读全文', 'atlas-open'); link.href = post.path; detail.append(link);
      const tags = el('div', null, 'atlas-tag-links');
      for (const name of post.tags) { const link = el('a', name); link.href = post.tagPaths[name]; tags.append(link); }
      detail.append(tags);
    } else { detail.append(el('p', '标签', 'atlas-meta'), el('h2', node.label)); const link = el('a', '查看标签归档'); link.href = node.path || '/tags/'; if (node.path) detail.append(link); }
    const matches = node.kind === 'tag' ? visiblePosts.filter(p => p.tags.includes(node.label) || !p.tags.length && node.label === '未标记') : visiblePosts;
    listPosts(matches, node.kind === 'tag' ? `${node.label} · ${matches.length} 篇` : '文章索引'); drawLater();
  }
  let visiblePosts = [];
  function rebuild() {
    simulation?.stop(); selected = hovered = null; visiblePosts = searchPosts(posts, search.value, tag.value); graph = graphData(visiblePosts);
    count.textContent = `${visiblePosts.length} 篇文章 · ${graph.nodes.length-visiblePosts.length} 个标签`;
    simulation = forceSimulation(graph.nodes).force('links', forceLink(graph.links).id(node => node.id).distance(72).strength(.4)).force('charge', forceManyBody().strength(-95)).force('collision', forceCollide(node => radius(node)+(node.kind === 'tag' && node.count > 1 ? 28 : 14))).force('x', forceX().strength(width < 600 ? .2 : .065)).force('y', forceY().strength(width < 600 ? .08 : .12)).stop();
    simulation.tick(180); fit(); simulation.on('tick', drawLater); if (!paused && graph.nodes.length) simulation.alpha(.18).restart();
    detail.replaceChildren(el('h2', '文章与标签'), el('p', `${visiblePosts.length} 篇文章`, 'atlas-meta'));
    if (visiblePosts.length) inspect(graph.nodes.find(node => node.kind === 'post'), false);
    else { detail.append(el('p', '没有匹配的文章')); listPosts([], '文章索引'); }
    drawLater();
  }
  const resize = () => {
    const oldWidth = width; width = stage.clientWidth; height = stage.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(width*ratio); canvas.height = Math.round(height*ratio);
    if (simulation && Math.abs(width-oldWidth) > 20) { simulation.stop(); simulation.force('x').strength(width < 600 ? .2 : .065); simulation.force('y').strength(width < 600 ? .08 : .12); simulation.alpha(.5).tick(100); if (!paused) simulation.restart(); }
    fit(); drawLater();
  };
  new ResizeObserver(resize).observe(stage);
  new MutationObserver(drawLater).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('visibilitychange', () => { if (document.hidden) simulation.stop(); else if (!paused) simulation.alpha(.1).restart(); });
  addEventListener('pagehide', () => { simulation.stop(); cancelAnimationFrame(frame); });
  search.addEventListener('input', rebuild); tag.addEventListener('change', rebuild); resize(); rebuild();
}
