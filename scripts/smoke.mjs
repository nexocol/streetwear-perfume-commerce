import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const required=['site/index.html','site/styles.css','site/js/app.js','site/js/data.js','site/js/store.js','site/robots.txt','wrangler.jsonc'];
for(const f of required)await access(path.join(root,f));
const [html,css,app,data,store]=await Promise.all([
  readFile(path.join(root,'site/index.html'),'utf8'),readFile(path.join(root,'site/styles.css'),'utf8'),readFile(path.join(root,'site/js/app.js'),'utf8'),readFile(path.join(root,'site/js/data.js'),'utf8'),readFile(path.join(root,'site/js/store.js'),'utf8')
]);
const checks=[
 [html.includes('id="app"'),'app shell'],
 [html.includes('noindex,nofollow'),'preview noindex'],
 [app.includes('store.home()'),'home source of truth'],
 [data.includes('heroSecondaryProductId'),'merchandising slots'],
 [app.includes('data-filter-panel'),'catalog filter panel'],
 [app.includes('data-quick-picker'),'quick add selector'],
 [!app.includes('♡'),'decorative wishlist removed'],
 [app.includes('relatedProducts'),'PDP recommendations'],
 [app.includes('trustRail'),'customer service rail'],
 [store.includes('changeCartQuantity'),'cart quantity'],
 [store.includes('removeCartItem'),'cart remove'],
 [app.includes('scrollToHash'),'hash navigation'],
 [app.includes("e.key!=='Escape'"),'escape handling'],
 [app.includes('UI / PROTOTYPE'),'admin prototype status'],
 [app.includes('data-gallery-current'),'mobile gallery indicator'],
 [css.includes('prefers-reduced-motion'),'reduced motion'],
 [css.includes('.nav.inverse'),'header states'],
 [data.includes("nameStatus:'provisional'"),'provisional naming marker'],
 [!app.includes('[ BRAND ]')&&!data.includes("placeholder: '[ BRAND ]'"),'brand placeholder removed']
];
let failed=false;for(const [ok,name] of checks){console.log((ok?'PASS: ':'FAIL: ')+name);if(!ok)failed=true}if(failed)process.exit(1);
