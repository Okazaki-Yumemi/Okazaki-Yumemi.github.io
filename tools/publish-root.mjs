import { cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const files = JSON.parse(await readFile(path.join(root, 'public-files.json'), 'utf8'));
for (const name of files) {
  await cp(path.join(root, 'public', name), path.join(root, name), { recursive: true });
}
await writeFile(path.join(root, '.nojekyll'), '');
console.log('Updated GitHub Pages root output.');
