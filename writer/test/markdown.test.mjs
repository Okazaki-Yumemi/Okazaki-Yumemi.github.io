import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { load } from 'cheerio';
import MarkdownIt from 'markdown-it';
import mathjax from 'markdown-it-mathjax3';
import mathDelimiters from '../../lib/math-delimiters.cjs';
import { createMarkdownRenderer } from '../ui/markdown.mjs';
import { browserBuildOptions } from '../browser-build.mjs';

for (const [name, renderer] of [
  ['writer preview', createMarkdownRenderer()],
  ['published Markdown', new MarkdownIt({ html: true }).use(mathjax).use(mathDelimiters)]
]) {
  test(`${name} renders dollar and bracket formulas as SVG`, () => {
    const $ = load(renderer.render(String.raw`Inline $x_1^2$ and \(\frac{1}{2}\).

$$
\sum_{i=1}^{n} a_i
$$

\[
\begin{aligned}
a &= b + c \\
d &= e + f
\end{aligned}
\]

\[x = y\]
`));
    assert.equal($('mjx-container').length, 5);
    assert.equal($('mjx-container[display=true]').length, 3);
    assert.equal($('mjx-container svg').length, 5);
    assert.equal($('[data-mml-node=merror]').length, 0);
  });

  test(`${name} preserves code, currency and escaped delimiters`, () => {
    const $ = load(renderer.render(String.raw`Code: \`$x^2$\` and \`\(x\)\`.

\`\`\`tex
$$x^2$$
\[y = z\]
\`\`\`

Prices $20 and $30. Escaped \$x\$ and \\(x\\).
`.replaceAll('\\`', '`')));
    assert.equal($('mjx-container').length, 0);
    assert.match($('code').text(), /\$x\^2\$/);
    assert.match($('pre code').text(), /\\\[y = z\\\]/);
    assert.match($('body').text(), /Prices \$20 and \$30/);
  });

  test(`${name} handles bracket equations in lists and quotes`, () => {
    const $ = load(renderer.render(String.raw`- List item

  \[
  x^2 + y^2 = z^2
  \]

> \[a = b\]

Prose \[c = d\] after.
`));
    assert.equal($('li mjx-container').length, 1);
    assert.equal($('blockquote mjx-container').length, 1);
    assert.equal($('mjx-container').length, 3);
    assert.match($('body').text(), /after\./);
  });

  test(`${name} renders double-dollar formulas beside prose and in tables`, () => {
    const $ = load(renderer.render(String.raw`Equation $$\sum_{i=1}^n x_i$$ followed by prose.

| Inline | Display |
| --- | --- |
| $x_1$ | $$x_2^2$$ |

- $a^2 + b^2$
`));
    assert.equal($('mjx-container').length, 4);
    assert.equal($('mjx-container[display=true]').length, 2);
    assert.equal($('td mjx-container').length, 2);
    assert.equal($('li mjx-container').length, 1);
    assert.match($('body').text(), /followed by prose\./);
  });

  test(`${name} renders formulas in existing published notes`, async () => {
    const source = await readFile(new URL('../../source/_posts/note-20261029-b5e101e0.md', import.meta.url), 'utf8');
    const $ = load(renderer.render(source.replace(/^---[\s\S]*?\n---\s*/, '')));
    assert.equal($('mjx-container').length, 3);
    assert.equal($('[data-mml-node=merror]').length, 0);
  });
}

test('preview keeps raw HTML and dangerous Markdown / TeX links inert', () => {
  const renderer = createMarkdownRenderer();
  const $ = load(renderer.render(String.raw`<img src=x onerror=alert(1)>

[bad](javascript:alert(1))

$\href{javascript:alert(1)}{click}$

$\style{position:fixed}{x}$

$\class{attacker}{x}$
`));
  assert.equal($('img, script, a[href], [onerror], .attacker').length, 0);
  assert.equal($('[style*="position: fixed"], [style*="position:fixed"]').length, 0);
  assert.match($('body').text(), /<img src=x onerror=alert\(1\)>/);
});

test('browser bundle renders math with dynamic JavaScript compilation disabled', async () => {
  const result = await build({
    ...browserBuildOptions,
    entryPoints: [fileURLToPath(new URL('../ui/markdown.mjs', import.meta.url))],
    write: false,
    minify: true,
    format: 'iife',
    globalName: 'writerMarkdown'
  });
  const sandbox = {};
  runInNewContext(result.outputFiles[0].text, sandbox, { contextCodeGeneration: { strings: false, wasm: false } });
  const $ = load(sandbox.writerMarkdown.createMarkdownRenderer().render(String.raw`$\frac{1}{2}$`));
  assert.equal($('mjx-container svg').length, 1);
  assert.equal($('[data-mml-node=merror]').length, 0);
});
