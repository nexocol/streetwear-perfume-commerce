import { readFile, access } from 'node:fs/promises'
import path from 'node:path'
const root=process.cwd()
const required=[
  'index.html','vite.config.ts','src/main.tsx','src/App.tsx','src/types.ts','src/styles.css','src/v3.css',
  'src/worker.ts','src/server/schema.ts','src/lib/catalogRepository.ts','src/context/AdminAccessContext.tsx',
  'src/admin/AdminProductEditPage.tsx','src/admin/AdminHomePage.tsx','src/admin/AdminSettingsPage.tsx',
  'migrations/0001_d1_schema.sql','migrations/0002_seed_v26.sql','wrangler.v3.jsonc'
]
for(const f of required)await access(path.join(root,f))
const [app,repo,worker,schema,config,pkg]=await Promise.all([
  readFile(path.join(root,'src/App.tsx'),'utf8'),
  readFile(path.join(root,'src/lib/catalogRepository.ts'),'utf8'),
  readFile(path.join(root,'src/worker.ts'),'utf8'),
  readFile(path.join(root,'src/server/schema.ts'),'utf8'),
  readFile(path.join(root,'wrangler.v3.jsonc'),'utf8'),
  readFile(path.join(root,'package.json'),'utf8')
])
const checks=[
  [app.includes('/product/:slug'),'robust product route'],
  [app.includes('products/:id'),'admin product editor route'],
  [repo.includes("'/api/catalog'"),'D1-backed catalog API client'],
  [repo.includes("'/api/admin/session'"),'Cloudflare Access session client'],
  [worker.includes("env.DB.prepare"),'D1 Worker API'],
  [worker.includes("env.MEDIA.put"),'R2 upload pipeline'],
  [worker.includes("ctx.access"),'Cloudflare Access admin gate'],
  [schema.includes('CREATE TABLE IF NOT EXISTS products'),'D1 schema'],
  [schema.includes('INSERT OR IGNORE INTO products'),'V2.6 data seed'],
  [config.includes('"binding": "DB"'),'D1 binding config'],
  [config.includes('"binding": "MEDIA"'),'R2 binding config'],
  [!pkg.includes('@supabase/supabase-js'),'Supabase dependency removed'],
  [!repo.includes('supabase'),'Supabase repository removed']
]
let failed=false
for(const [ok,name] of checks){console.log((ok?'PASS: ':'FAIL: ')+name);if(!ok)failed=true}
if(failed)process.exit(1)
