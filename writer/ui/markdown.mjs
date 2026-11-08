import MarkdownIt from 'markdown-it';
import mathjax from 'markdown-it-mathjax3';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import mathDelimiters from '../../lib/math-delimiters.cjs';

export function createMarkdownRenderer() {
  return new MarkdownIt({ html: false, linkify: true, breaks: false })
    // TeX's html extension can introduce links and styles outside Markdown's
    // URL validation. The editor previews mathematics, not those HTML commands.
    .use(mathjax, { tex: { packages: AllPackages.filter(name => name !== 'html') } })
    .use(mathDelimiters);
}
