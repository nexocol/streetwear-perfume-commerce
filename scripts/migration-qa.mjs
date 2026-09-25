// V4.4G migration QA. Runs the real Worker (wrangler dev --local) against LOCAL D1 copies only. Never touches remote resources.
//   npm run build && node scripts/migration-qa.mjs [--from-export path/to/prod_export.sql]
// Without --from-export it builds a synthetic V1 database (schema v1 + seed + filler) with 28 products / 120 variants / 6 categories.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root=process.cwd()
const wrangler=path.join(root,'node_modules/wrangler/bin/wrangler.js')
const DB='streetwear-perfume-commerce-db'
const argFrom=process.argv.indexOf('--from-export')
const fromExport=argFrom>0?process.argv[argFrom+1]:null
const work=path.join(tmpdir(),'v44g-migration-qa-'+process.pid)
rmSync(work,{recursive:true,force:true});mkdirSync(work,{recursive:true})
if(!existsSync(path.join(root,'dist/index.html'))){console.error('dist/ missing: run npm run build first');process.exit(2)}

let failures=0
const check=(ok,name,extra='')=>{console.log((ok?'PASS: ':'FAIL: ')+name+(extra?'  '+extra:''));if(!ok)failures++}

function sqlFromSchemaTs(name){
  const src=readFileSync(path.join(root,'src/server/schema.ts'),'utf8')
  const m=src.match(new RegExp('export const '+name+'=String\\.raw`([\\s\\S]*?)`;'))
  if(!m)throw new Error('cannot extract '+name)
  return m[1]
}
function syntheticV1(){
  let sql=sqlFromSchemaTs('SCHEMA_SQL')+'\n'+sqlFromSchemaTs('SEED_SQL')+'\n'
  sql+="INSERT INTO schema_migrations(version,applied_at) VALUES(1,'2026-09-22 22:19:34');\n"
  sql+="INSERT INTO categories(id,slug,name,enabled,sort_order) VALUES('cat-sudaderas','sudaderas','Sudaderas',1,5),('cat-shorts','shorts','Shorts',1,6);\n"
  // seed already has 6 products / 20 variants; add 22 products / 100 variants -> 28 / 120
  for(let i=1;i<=22;i++){
    const id='filler-'+String(i).padStart(2,'0'),n=i<=12?5:4
    sql+=`INSERT INTO products(id,slug,name,name_status,category_id,price,status,sort_order,features_json) VALUES('${id}','${id}','Filler ${i}','confirmed','cat-sudaderas',100000,'${i%2?'active':'draft'}',${100+i},'["x"]');\n`
    for(let s=1;s<=n;s++)sql+=`INSERT INTO variants(id,product_id,size,color,stock,available,sort_order) VALUES('${id}-${s}','${id}','S${s}',${s%2?'NULL':"'Negro'"},10,1,${s});\n`
  }
  sql+="UPDATE variants SET stock=10 WHERE product_id LIKE 'perfume-%';UPDATE products SET price=100000 WHERE id LIKE 'perfume-%';\n"
  return sql
}

const wr=(args,persist)=>{
  const r=spawnSync(process.execPath,[wrangler,'d1','execute',DB,'--local','--persist-to',persist,'--json',...args],{cwd:root,encoding:'utf8',maxBuffer:1e8})
  if(r.status!==0)throw new Error('wrangler d1 execute failed: '+(r.stdout||'')+(r.stderr||''))
  const out=r.stdout
  return out.includes('[')?JSON.parse(out.slice(out.indexOf('[')))[0]?.results:[]
}
const q=(persist,sql)=>wr(['--command',sql],persist)
const TABLES=['categories','collections','fits','products','variants','product_media','product_collections','homepage_settings','site_settings','admin_audit_log','schema_migrations']
function dump(persist){
  const d={}
  for(const t of TABLES)d[t]=q(persist,`SELECT * FROM ${t} ORDER BY 1,2`)
  return d
}
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const strip=rows=>rows.map(r=>{const {fragrance_family,...rest}=r;return rest})

let port=8790
async function startWorker(persist){
  const p=port++
  const child=spawn(process.execPath,[wrangler,'dev','--local','--persist-to',persist,'--port',String(p),'--var','ADMIN_DEV_BYPASS:true'],{cwd:root,stdio:['ignore','pipe','pipe']})
  let log=''
  child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d)
  const t0=Date.now()
  while(!/Ready on/.test(log)){
    if(Date.now()-t0>60000){child.kill();throw new Error('wrangler dev did not start:\n'+log)}
    await new Promise(r=>setTimeout(r,300))
  }
  return {base:'http://127.0.0.1:'+p,stop:async()=>{
    if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'])
    else child.kill('SIGKILL')
    await new Promise(r=>setTimeout(r,800))
  }}
}
const j=async(res)=>({status:res.status,body:await res.json().catch(()=>null)})

async function run(){
  // ---------- A. V1 database with real-shaped data -> V2 ----------
  console.log('\n== A. existing V1 database -> V2 ==')
  const dbA=path.join(work,'a');mkdirSync(dbA)
  const v1File=path.join(work,'v1.sql')
  if(fromExport){writeFileSync(v1File,readFileSync(fromExport,'utf8'))}else writeFileSync(v1File,syntheticV1())
  wr(['--file',v1File],dbA)
  const before=dump(dbA)
  const counts=t=>before[t].length
  check(counts('products')===28&&counts('variants')===120&&counts('categories')===6,'V1 fixture has 28 products / 120 variants / 6 categories',`(${counts('products')}/${counts('variants')}/${counts('categories')})`)
  check(JSON.stringify(before.schema_migrations.map(r=>r.version))==='[1]','V1 fixture records only schema version 1')
  check(!('fragrance_family' in before.products[0]),'V1 products has no fragrance_family column')

  let w=await startWorker(dbA)
  const health=await j(await fetch(w.base+'/api/health'))
  check(health.status===200&&health.body.schema&&health.body.products===28,'worker boots on V1 data and reports 28 products',JSON.stringify(health.body))
  await w.stop()
  const after=dump(dbA)
  check(after.products.length===28&&after.variants.length===120,'after migration: still 28 products / 120 variants')
  check(after.products.every(r=>'fragrance_family' in r&&r.fragrance_family===null),'fragrance_family exists and is NULL for every existing product')
  check(sha(strip(after.products))===sha(before.products),'products identical apart from the new column')
  for(const t of TABLES.filter(t=>!['products','schema_migrations'].includes(t)))check(sha(after[t])===sha(before[t]),`table ${t} byte-identical`)
  check(JSON.stringify(after.schema_migrations.map(r=>r.version))==='[1,2]','schema_migrations now [1,2]')
  check(after.schema_migrations[0].applied_at===before.schema_migrations[0].applied_at,'v1 row untouched (SEED_SQL not re-run)')
  const v2At=after.schema_migrations[1].applied_at

  // ---------- B. idempotent on restart ----------
  console.log('\n== B. restart is idempotent ==')
  w=await startWorker(dbA)
  const h2=await j(await fetch(w.base+'/api/health'))
  check(h2.status===200,'worker restarts cleanly on a V2 database')
  const cat=await j(await fetch(w.base+'/api/catalog'))
  check(cat.body.products.every(p=>'fragranceFamily' in p&&p.fragranceFamily===null),'/api/catalog returns fragranceFamily (null) for every product')
  const afterRestart=dump(dbA)
  check(afterRestart.schema_migrations.length===2&&afterRestart.schema_migrations[1].applied_at===v2At,'schema_migrations unchanged after restart')
  check(sha(afterRestart.products)===sha(after.products),'products unchanged after restart')

  // ---------- D. API: save / duplicate ----------
  console.log('\n== D. saveProduct / duplicate ==')
  const admin=await j(await fetch(w.base+'/api/admin/catalog'))
  const p1=admin.body.products.find(p=>p.id==='perfume-01')
  const put=async(product)=>j(await fetch(w.base+'/api/admin/products/'+product.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({product,collectionIds:p1.collections.map(c=>c.id)})}))
  let r=await put({...p1,fragranceFamily:'Ámbar floral'})
  check(r.status===200&&r.body.fragranceFamily==='Ámbar floral','PUT with fragranceFamily persists it (UTF-8 intact)')
  check(q(dbA,"SELECT fragrance_family f FROM products WHERE id='perfume-01'")[0].f==='Ámbar floral','value present in D1')
  const {fragranceFamily:_omit,...legacy}=p1
  r=await put({...legacy,subtitle:'edit sin familia'})
  check(r.status===200&&r.body.fragranceFamily==='Ámbar floral'&&r.body.subtitle==='edit sin familia','PUT that omits the key (stale client) preserves the family')
  r=await put({...p1,fragranceFamily:'   '})
  check(r.body.fragranceFamily===null,'blank string clears to NULL')
  r=await put({...p1,fragranceFamily:'  Floral frutal gourmand '})
  check(r.body.fragranceFamily==='Floral frutal gourmand','value is trimmed')
  const dup=await j(await fetch(w.base+'/api/admin/products/perfume-01/duplicate',{method:'POST'}))
  const copy=q(dbA,`SELECT fragrance_family f,status s FROM products WHERE id='${dup.body.id}'`)[0]
  check(copy.f==='Floral frutal gourmand'&&copy.s==='draft','duplicate carries fragranceFamily and is a draft')
  const others=dump(dbA)
  const untouched=rows=>rows.filter(x=>!['perfume-01'].includes(x.id)&&x.id!==dup.body.id)
  check(sha(untouched(strip(others.products)))===sha(untouched(strip(before.products)).map(x=>x)),'no other product changed (price/status/etc.)')
  check(others.variants.filter(v=>v.product_id!=='perfume-01'&&v.product_id!==dup.body.id).length===119&&sha(others.variants.filter(v=>v.product_id!=='perfume-01'&&v.product_id!==dup.body.id).map(({id,...x})=>x))===sha(before.variants.filter(v=>v.product_id!=='perfume-01').map(({id,...x})=>x)),'other products\' variants unchanged')
  await w.stop()

  // ---------- F. content SQL touches only the 2 perfumes / 7 fields ----------
  console.log('\n== F. perfume content SQL ==')
  const dbF=path.join(work,'f');mkdirSync(dbF)
  wr(['--file',v1File],dbF)
  w=await startWorker(dbF);await fetch(w.base+'/api/health');await w.stop()
  const pre=dump(dbF)
  wr(['--file',path.join(root,'scripts/sql/v44g-perfumes-content.sql')],dbF)
  const post=dump(dbF)
  const allowed=new Set(['name','name_status','subtitle','description','fragrance_family','features_json','updated_at'])
  const changed=new Set(),touchedIds=new Set()
  post.products.forEach((row,i)=>{for(const k of Object.keys(row))if(JSON.stringify(row[k])!==JSON.stringify(pre.products[i][k])){changed.add(k);touchedIds.add(row.id)}})
  check([...touchedIds].sort().join()==='perfume-01,perfume-02','content SQL touches only perfume-01 and perfume-02',[...touchedIds].join())
  check([...changed].every(k=>allowed.has(k)),'content SQL changes only authorized columns',[...changed].join())
  for(const t of TABLES.filter(t=>t!=='products'))check(sha(post[t])===sha(pre[t]),`content SQL leaves ${t} untouched`)
  const pv=post.products.filter(p=>p.id.startsWith('perfume-'))
  check(pv.every(p=>p.price===100000&&p.status==='active'),'perfume price (100000) and status (active) preserved')
  check(pv[0].fragrance_family==='Ámbar floral'&&pv[1].fragrance_family==='Floral frutal gourmand','families written')
  check(JSON.parse(pv[0].features_json).length===3&&JSON.parse(pv[1].features_json).length===3,'3 note lines each')
  wr(['--file',path.join(root,'scripts/sql/v44g-perfumes-content-rollback.sql')],dbF)
  const rb=dump(dbF)
  check(sha(strip(rb.products).map(({updated_at,...x})=>x))===sha(strip(pre.products).map(({updated_at,...x})=>x))&&rb.products.every(p=>p.fragrance_family===null),'rollback SQL restores the pre-content values exactly (except updated_at)')

  // ---------- C. column already present (e.g. wrangler d1 migrations apply ran first) ----------
  console.log('\n== C. column already exists before the Worker runs ==')
  const dbC=path.join(work,'c');mkdirSync(dbC)
  wr(['--file',v1File],dbC)
  q(dbC,'ALTER TABLE products ADD COLUMN fragrance_family TEXT')
  w=await startWorker(dbC)
  const hc=await j(await fetch(w.base+'/api/health'))
  check(hc.status===200&&!hc.body.error,'worker tolerates an already-added column',JSON.stringify(hc.body))
  await w.stop()
  check(JSON.stringify(q(dbC,'SELECT version FROM schema_migrations ORDER BY 1').map(r=>r.version))==='[1,2]','v2 recorded without a duplicate-column failure')

  // ---------- E. brand-new database ----------
  console.log('\n== E. brand-new database ==')
  const dbE=path.join(work,'e');mkdirSync(dbE)
  w=await startWorker(dbE)
  const he=await j(await fetch(w.base+'/api/health'))
  check(he.status===200&&he.body.schema&&he.body.seed,'empty D1 initializes',JSON.stringify(he.body))
  const ce=await j(await fetch(w.base+'/api/catalog'))
  check(ce.body.products.length===6&&ce.body.products.every(p=>p.fragranceFamily===null),'fresh DB serves the seed with fragranceFamily=null')
  await w.stop()
  check(JSON.stringify(q(dbE,'SELECT version FROM schema_migrations ORDER BY 1').map(r=>r.version))==='[1,2]','fresh DB records versions 1 and 2')
  check(q(dbE,"SELECT COUNT(*) n FROM pragma_table_info('products') WHERE name='fragrance_family'")[0].n===1,'fresh DB has the fragrance_family column')
}

try{await run()}catch(e){console.error('QA crashed:',e);failures++}
finally{rmSync(work,{recursive:true,force:true})}
console.log(failures?`\n${failures} check(s) FAILED`:'\nAll migration checks passed')
process.exit(failures?1:0)
