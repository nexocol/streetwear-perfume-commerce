import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const required = [
  'site/index.html',
  'site/styles.css',
  'site/js/app.js',
  'site/js/data.js',
  'site/js/store.js',
  'wrangler.jsonc'
];

for (const file of required) await access(path.join(root,file));

const [html,app,data,css] = await Promise.all([
  readFile(path.join(root,'site/index.html'),'utf8'),
  readFile(path.join(root,'site/js/app.js'),'utf8'),
  readFile(path.join(root,'site/js/data.js'),'utf8'),
  readFile(path.join(root,'site/styles.css'),'utf8')
]);

const checks = [
  [html.includes('id="app"'), 'app shell'],
  [app.includes("path==='/admin'"), 'admin route'],
  [app.includes('cart()'), 'cart system'],
  [data.includes('shopifyMapping'), 'Shopify-ready mapping'],
  [data.includes('sizeGuide'), 'size guide'],
  [css.includes('prefers-reduced-motion'), 'reduced motion'],
  [html.includes('viewport'), 'responsive viewport']
];

let failed=false;
for(const [ok,name] of checks){
  console.log((ok?'PASS: ':'FAIL: ')+name);
  if(!ok) failed=true;
}
if(failed) process.exit(1);
