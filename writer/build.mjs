import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('.writer-build/assets', { recursive: true });
await build({ entryPoints: ['writer/ui/app.mjs'], bundle: true, format: 'esm', platform: 'browser', target: 'es2022', outfile: '.writer-build/assets/app.js', minify: true });
await build({ entryPoints: ['writer/worker.mjs'], bundle: true, format: 'esm', platform: 'browser', target: 'es2022', outfile: '.writer-build/worker.mjs', minify: true });
await copyFile('writer/ui/index.html', '.writer-build/assets/index.html');
await copyFile('writer/ui/app.css', '.writer-build/assets/app.css');
console.log('Built writer UI and Worker.');
