import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const required=['site/index.html','site/styles.css','site/js/app.js','site/js/data.js','site/js/store.js'];
for(const f of required)await access(path.join(root,f));
const html=await readFile(path.join(root,'site/index.html'),'utf8');
const css=await readFile(path.join(root,'site/styles.css'),'utf8');
const app=await readFile(path.join(root,'site/js/app.js'),'utf8');
const data=await readFile(path.join(root,'site/js/data.js'),'utf8');
const store=await readFile(path.join(root,'site/js/store.js'),'utf8');
const checks=[
 [html.includes('id="app"'),'app shell'],
 [app.includes('store.home()'),'home source of truth'],
 [data.includes('heroSecondaryProductId'),'merchandising slots'],
 [app.includes('data-quick-picker'),'quick add selector'],
 [store.includes('changeCartQuantity'),'cart quantity'],
 [store.includes('removeCartItem'),'cart remove'],
 [app.includes('scrollToHash'),'hash navigation'],
 [app.includes("e.key!=='Escape'"),'escape handling'],
 [app.includes('CMS BACKEND — NEXT PHASE'),'admin prototype status'],
 [app.includes('data-gallery-current'),'mobile gallery indicator'],
 [css.includes('prefers-reduced-motion'),'reduced motion'],
 [css.includes('.nav.inverse'),'header states']
];
let failed=false;
for(const [ok,name] of checks){console.log((ok?'PASS: ':'FAIL: ')+name);if(!ok)failed=true}
if(failed)process.exit(1);
