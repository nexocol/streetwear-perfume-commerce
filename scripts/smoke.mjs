import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
await access(path.join(root, 'site/index.html'));
await access(path.join(root, 'wrangler.jsonc'));
const html = await readFile(path.join(root, 'site/index.html'), 'utf8');

const checks = [
  [html.includes('WEAR THE'), 'editorial hero'],
  [html.includes('/admin'), 'admin route'],
  [html.includes('cartDrawer'), 'cart system'],
  [html.includes('shopifyVariantId'), 'Shopify-ready mapping'],
  [html.includes('prefers-reduced-motion'), 'reduced motion'],
  [html.includes('Encuentra tu talla ideal'), 'size guide']
];

let failed = false;
for (const [ok, name] of checks) {
  console.log((ok ? 'PASS: ' : 'FAIL: ') + name);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
