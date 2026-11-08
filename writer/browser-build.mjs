import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const browserBuildOptions = {
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  // MathJax's source otherwise uses eval('require') to read its Node package
  // version. Resolve it at build time so the browser keeps script-src 'self'.
  define: { PACKAGE_VERSION: JSON.stringify(require('mathjax-full/package.json').version) }
};
