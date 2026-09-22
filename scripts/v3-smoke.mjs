import { readFile, access } from 'node:fs/promises'
import path from 'node:path'

const root=process.cwd()
const required=[
  'index.html','vite.config.ts','src/main.tsx','src/App.tsx','src/types.ts','src/styles.css','src/v3.css',
  'src/lib/supabase.ts','src/lib/catalogRepository.ts','src/context/AuthContext.tsx',
  'src/admin/AdminProductEditPage.tsx','src/admin/AdminHomePage.tsx','src/admin/AdminSettingsPage.tsx',
  'supabase/migrations/20260922_000001_commerce_foundation.sql','supabase/seed.sql','wrangler.jsonc'
]
for(const f of required)await access(path.join(root,f))
const [app,repo,sql,home,settings]=await Promise.all([
  readFile(path.join(root,'src/App.tsx'),'utf8'),
  readFile(path.join(root,'src/lib/catalogRepository.ts'),'utf8'),
  readFile(path.join(root,'supabase/migrations/20260922_000001_commerce_foundation.sql'),'utf8'),
  readFile(path.join(root,'src/admin/AdminHomePage.tsx'),'utf8'),
  readFile(path.join(root,'src/admin/AdminSettingsPage.tsx'),'utf8')
])
const checks=[
  [app.includes('/product/:slug'),'robust product route'],
  [app.includes('/admin/products/:id'),'admin product editor route'],
  [repo.includes("from('products')"),'Supabase catalog source'],
  [repo.includes("storage.from('product-media')"),'Storage media pipeline'],
  [sql.includes('enable row level security'),'RLS enabled'],
  [sql.includes('private.is_admin'),'admin RLS helper'],
  [home.includes('saveHomepage'),'Home CMS'],
  [settings.includes('saveSiteSettings'),'Site settings'],
  [settings.includes('COLECCIONES'),'taxonomy CMS']
]
let failed=false
for(const [ok,name] of checks){console.log((ok?'PASS: ':'FAIL: ')+name);if(!ok)failed=true}
if(failed)process.exit(1)
