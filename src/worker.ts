import { SCHEMA_SQL, SEED_SQL, BASE_SCHEMA_VERSION, SCHEMA_VERSION, MIGRATION_V2_COLUMN, MIGRATION_V2_SQL } from './server/schema'
import { shopifyConfigured, shopifyHealth, shopifyCartCreate, shopifyFetchOverlay, toVariantGid, ShopifyUserError, type ShopifyEnv } from './server/shopify'
import { parseCheckoutContext, cartAttributesFor } from './lib/shippingRegions'
import { parseCommercialTerms } from './lib/clientContent'
import { getSessionUser, handleLogin, handleLogout, handleChangePassword, rejectCrossOrigin, DEMO_MESSAGE } from './server/adminAuth'
import { seedCatalog } from './data/seed'

type AccessIdentity={email?:string|null}
type AccessContext={access?:{getIdentity:()=>Promise<AccessIdentity|null>}}
type Env=ShopifyEnv&{
  DB:any
  MEDIA:any
  ASSETS:{fetch:(request:Request)=>Promise<Response>}
  ADMIN_DEV_BYPASS?:string
}

let ready=false
function splitSqlScript(sql:string){
  return sql.split(';').map(s=>s.trim()).filter(Boolean)
}
async function runSqlScript(env:Env,sql:string){
  for(const statement of splitSqlScript(sql)){
    await env.DB.prepare(statement).run()
  }
}
async function migrateToV2(env:Env){
  // Idempotent: skip the ALTER when the column already exists (manual `wrangler d1 migrations apply`, or another isolate won the race).
  const has=await env.DB.prepare("SELECT COUNT(*) AS n FROM pragma_table_info('products') WHERE name=?").bind(MIGRATION_V2_COLUMN).first()
  if(!Number(has?.n||0)){
    try{await env.DB.prepare(MIGRATION_V2_SQL).run()}
    catch(error){if(!/duplicate column/i.test(error instanceof Error?error.message:String(error)))throw error}
  }
  await env.DB.prepare('INSERT OR IGNORE INTO schema_migrations(version) VALUES(?)').bind(2).run()
}
async function ensureDatabase(env:Env){
  if(ready)return
  try{
    await env.DB.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').first()
  }catch{
    await runSqlScript(env,SCHEMA_SQL)
  }
  const applied=new Set<number>(((await env.DB.prepare('SELECT version FROM schema_migrations').all()).results||[]).map((r:any)=>Number(r.version)))
  if(!applied.has(BASE_SCHEMA_VERSION)){
    await runSqlScript(env,SEED_SQL)
    await env.DB.prepare('INSERT INTO schema_migrations(version) VALUES(?)').bind(BASE_SCHEMA_VERSION).run()
  }
  if(SCHEMA_VERSION>=2&&!applied.has(2))await migrateToV2(env)
  ready=true
}

function json(data:unknown,status=200,headers:HeadersInit={}){
  return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}})
}
async function parseJson<T=any>(request:Request):Promise<T>{
  try{return await request.json() as T}catch{throw new Error('JSON inválido')}
}
function bool(v:any){return Boolean(Number(v))}
function parseArray<T=any>(value:any,fallback:T[]=[]):T[]{try{return JSON.parse(value||'[]')}catch{return fallback}}

function decodeAccessEmail(token:string){
  try{
    const part=token.split('.')[1]
    if(!part)return null
    const normalized=part.replace(/-/g,'+').replace(/_/g,'/')
    const padded=normalized+'='.repeat((4-normalized.length%4)%4)
    const payload=JSON.parse(atob(padded))
    return typeof payload.email==='string'?payload.email:null
  }catch{return null}
}
async function requireAdmin(request:Request,env:Env,ctx:AccessContext){
  if(env.ADMIN_DEV_BYPASS==='true')return {email:'dev@local'}
  if(ctx.access){
    const identity=await ctx.access.getIdentity()
    if(identity?.email)return {email:identity.email}
  }
  const accessJwt=request.headers.get('cf-access-jwt-assertion')
  if(accessJwt)return {email:decodeAccessEmail(accessJwt)}
  throw new Response('Cloudflare Access required',{status:403})
}
async function audit(env:Env,email:string|null,action:string,entityType?:string,entityId?:string){
  await env.DB.prepare('INSERT INTO admin_audit_log(id,actor_email,action,entity_type,entity_id) VALUES(?,?,?,?,?)')
    .bind(crypto.randomUUID(),email,action,entityType||null,entityId||null).run()
}

const OVERLAY_TTL_MS=45_000
let overlayCache:{key:string;expiresAt:number;data:Map<string,any>}|null=null
async function getShopifyOverlayCached(env:Env,productIds:string[]){
  const key=productIds.slice().sort().join(',')
  if(overlayCache&&overlayCache.key===key&&overlayCache.expiresAt>Date.now())return overlayCache.data
  const data=await shopifyFetchOverlay(env,productIds)
  overlayCache={key,expiresAt:Date.now()+OVERLAY_TTL_MS,data}
  return data
}
async function applyShopifyOverlay(env:Env,products:any[]){
  const mappedIds=products.map(p=>p.shopifyProductId).filter(Boolean)
  if(mappedIds.length===0)return
  let overlay:Map<string,any>
  try{overlay=await getShopifyOverlayCached(env,mappedIds)}
  catch(error){console.error('Shopify overlay fetch failed, keeping D1 values',error);return}
  for(const p of products){
    if(!p.shopifyProductId)continue
    const op=overlay.get(p.shopifyProductId)
    if(!op){for(const v of p.variants){v.available=false;v.stock=0}continue}
    const byGid=new Map(op.variants.map((v:any)=>[v.id,v]))
    for(const v of p.variants){
      if(!v.shopifyVariantId)continue
      const ov:any=byGid.get(toVariantGid(v.shopifyVariantId))
      if(!ov){v.available=false;v.stock=0;continue}
      v.price=ov.price
      // A null D1 stock marks a variant sold without an inventory count. Shopify's
      // Storefront quantityAvailable can still expose a previous numeric quantity.
      v.stock=v.stock===null?null:ov.quantityAvailable
      v.available=ov.availableForSale
    }
  }
}

async function getCatalog(env:Env,includeInactive=false){
  await ensureDatabase(env)
  const productsSql=`SELECT p.*,c.name AS category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id ${includeInactive?'':'WHERE p.status="active"'} ORDER BY p.sort_order,p.name`
  const [productsRes,variantsRes,mediaRes,linkRes,categoriesRes,collectionsRes,fitsRes,home,site]=await Promise.all([
    env.DB.prepare(productsSql).all(),
    env.DB.prepare('SELECT * FROM variants ORDER BY product_id,sort_order').all(),
    env.DB.prepare('SELECT * FROM product_media ORDER BY product_id,sort_order').all(),
    env.DB.prepare('SELECT pc.product_id,c.* FROM product_collections pc JOIN collections c ON c.id=pc.collection_id ORDER BY c.sort_order,c.name').all(),
    env.DB.prepare(`SELECT * FROM categories ${includeInactive?'':'WHERE enabled=1'} ORDER BY sort_order,name`).all(),
    env.DB.prepare(`SELECT * FROM collections ${includeInactive?'':'WHERE enabled=1'} ORDER BY sort_order,name`).all(),
    env.DB.prepare(`SELECT * FROM fits ${includeInactive?'':'WHERE enabled=1'} ORDER BY sort_order,name`).all(),
    env.DB.prepare('SELECT * FROM homepage_settings WHERE id="default"').first(),
    env.DB.prepare('SELECT * FROM site_settings WHERE id="default"').first(),
  ])
  const variantsBy=new Map<string,any[]>(),mediaBy=new Map<string,any[]>(),colsBy=new Map<string,any[]>()
  for(const v of variantsRes.results||[]){const a=variantsBy.get(v.product_id)||[];a.push(v);variantsBy.set(v.product_id,a)}
  for(const m of mediaRes.results||[]){const a=mediaBy.get(m.product_id)||[];a.push(m);mediaBy.set(m.product_id,a)}
  for(const c of linkRes.results||[]){const a=colsBy.get(c.product_id)||[];a.push(c);colsBy.set(c.product_id,a)}
  const products=(productsRes.results||[]).map((p:any)=>({
    id:p.id,slug:p.slug,name:p.name,nameStatus:p.name_status,subtitle:p.subtitle,description:p.description,categoryId:p.category_id,category:p.category_name||'',fit:p.fit,color:p.color,fragranceFamily:p.fragrance_family??null,
    price:p.price==null?null:Number(p.price),compareAtPrice:p.compare_at_price==null?null:Number(p.compare_at_price),featured:bool(p.featured),bestSeller:bool(p.best_seller),newArrival:bool(p.new_arrival),status:p.status,sortOrder:p.sort_order,
    shopifyProductId:p.shopify_product_id,shopifyHandle:p.shopify_handle,features:parseArray<string>(p.features_json),
    variants:(variantsBy.get(p.id)||[]).map((v:any)=>({id:v.id,productId:v.product_id,size:v.size,color:v.color,sku:v.sku,price:v.price==null?null:Number(v.price),stock:v.stock==null?null:Number(v.stock),available:bool(v.available),shopifyVariantId:v.shopify_variant_id,sortOrder:v.sort_order})),
    media:(mediaBy.get(p.id)||[]).map((m:any)=>({id:m.id,productId:m.product_id,mediaType:m.media_type,storagePath:m.r2_key,publicUrl:m.r2_key?'/api/media/'+encodeURIComponent(m.id):m.public_url,alt:m.alt,sortOrder:m.sort_order})),
    collections:(colsBy.get(p.id)||[]).map((c:any)=>({id:c.id,slug:c.slug,name:c.name,enabled:bool(c.enabled),sortOrder:c.sort_order}))
  }))
  if(bool(site?.shopify_enabled)&&shopifyConfigured(env))await applyShopifyOverlay(env,products)
  return {
    products,
    categories:(categoriesRes.results||[]).map((r:any)=>({id:r.id,slug:r.slug,name:r.name,enabled:bool(r.enabled),sortOrder:r.sort_order})),
    collections:(collectionsRes.results||[]).map((r:any)=>({id:r.id,slug:r.slug,name:r.name,enabled:bool(r.enabled),sortOrder:r.sort_order})),
    fits:(fitsRes.results||[]).map((r:any)=>({id:r.id,slug:r.slug,name:r.name,enabled:bool(r.enabled),sortOrder:r.sort_order})),
    homepage:home?{id:home.id,heroProductId:home.hero_product_id,heroSecondaryProductId:home.hero_secondary_product_id,heroHeadline:home.hero_headline,heroSubheadline:home.hero_subheadline,featuredProductIds:parseArray<string>(home.featured_product_ids_json),fragrancePrimaryId:home.fragrance_primary_id,fragranceSecondaryId:home.fragrance_secondary_id,editorialProductId:home.editorial_product_id,editorialImageUrl:home.editorial_image_url}:null,
    site:site?{id:site.id,brandName:site.brand_name,logoUrl:site.logo_url,instagram:site.instagram,whatsapp:site.whatsapp,email:site.email,shippingCopy:site.shipping_copy,changesCopy:site.changes_copy,advisoryCopy:site.advisory_copy,storeStatus:site.store_status,shopifyEnabled:bool(site.shopify_enabled),previewNoindex:bool(site.preview_noindex)}:null
  }
}

async function saveProduct(env:Env,body:any){
  const p=body.product,collectionIds:string[]=body.collectionIds||[]
  if(!p?.id||!p?.slug||!p?.name)throw new Error('Producto incompleto')
  const statements:any[]=[
    env.DB.prepare(`INSERT INTO products(id,slug,name,name_status,subtitle,description,category_id,fit,color,price,compare_at_price,featured,best_seller,new_arrival,status,sort_order,features_json,shopify_product_id,shopify_handle,fragrance_family,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,name=excluded.name,name_status=excluded.name_status,subtitle=excluded.subtitle,description=excluded.description,category_id=excluded.category_id,fit=excluded.fit,color=excluded.color,price=excluded.price,compare_at_price=excluded.compare_at_price,featured=excluded.featured,best_seller=excluded.best_seller,new_arrival=excluded.new_arrival,status=excluded.status,sort_order=excluded.sort_order,features_json=excluded.features_json,shopify_product_id=excluded.shopify_product_id,shopify_handle=excluded.shopify_handle,fragrance_family=CASE WHEN ?=1 THEN excluded.fragrance_family ELSE products.fragrance_family END,updated_at=CURRENT_TIMESTAMP`)
      .bind(p.id,p.slug,p.name,p.nameStatus||'provisional',p.subtitle||null,p.description||null,p.categoryId||null,p.fit||null,p.color||null,p.price??null,p.compareAtPrice??null,p.featured?1:0,p.bestSeller?1:0,p.newArrival?1:0,p.status||'draft',p.sortOrder||0,JSON.stringify(p.features||[]),p.shopifyProductId||null,p.shopifyHandle||null,(typeof p.fragranceFamily==='string'?p.fragranceFamily.trim():'')||null,'fragranceFamily' in p?1:0),
    env.DB.prepare('DELETE FROM variants WHERE product_id=?').bind(p.id),
    env.DB.prepare('DELETE FROM product_collections WHERE product_id=?').bind(p.id)
  ]
  for(const [i,v] of (p.variants||[]).entries()){
    statements.push(env.DB.prepare('INSERT INTO variants(id,product_id,size,color,sku,price,stock,available,shopify_variant_id,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .bind(v.id&&!(v.id as string).startsWith('temp-')?v.id:crypto.randomUUID(),p.id,v.size,v.color||null,v.sku||null,v.price??null,v.stock??null,v.available===false?0:1,v.shopifyVariantId||null,i+1))
  }
  for(const cid of collectionIds)statements.push(env.DB.prepare('INSERT OR IGNORE INTO product_collections(product_id,collection_id) VALUES(?,?)').bind(p.id,cid))
  await env.DB.batch(statements)
  const catalog=await getCatalog(env,true)
  return catalog.products.find((x:any)=>x.id===p.id)
}

async function handleApi(request:Request,env:Env,ctx:AccessContext){
  const url=new URL(request.url);const path=url.pathname
  await ensureDatabase(env)

  if(request.method==='GET'&&path==='/api/health'){
    const health:any={release:'v3-d1-r2-hotfix-2',dbBinding:Boolean(env.DB),r2Binding:Boolean(env.MEDIA),schema:false,seed:false,error:null}
    try{
      await ensureDatabase(env)
      const migration=await env.DB.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').first()
      const productCount=await env.DB.prepare('SELECT COUNT(*) AS n FROM products').first()
      health.schema=Boolean(migration)
      health.seed=Number(productCount?.n||0)>0
      health.products=Number(productCount?.n||0)
    }catch(error){
      health.error=error instanceof Error?error.message:String(error)
    }
    return json(health,health.error?500:200)
  }

  if(request.method==='GET'&&path==='/api/catalog'){
    const data=await getCatalog(env,false)
    return json(data,200,{'Cache-Control':'public, max-age=30, stale-while-revalidate=60'})
  }

  if(request.method==='GET'&&path==='/api/shopify/health'){
    const apiVersion=env.SHOPIFY_STOREFRONT_API_VERSION||null
    if(!shopifyConfigured(env))return json({ok:false,configured:false,apiVersion},503)
    try{
      const {shopName,currency}=await shopifyHealth(env)
      return json({ok:true,configured:true,shopName,currency,apiVersion},200)
    }catch(error){
      return json({ok:false,configured:true,apiVersion,error:error instanceof Error?error.message:'Error desconocido'},503)
    }
  }

  if(request.method==='POST'&&path==='/api/shopify/checkout'){
    let body:any
    try{body=await parseJson(request)}catch{return json({error:'JSON inválido'},400)}
    const lines=Array.isArray(body?.lines)?body.lines:null
    if(!lines||lines.length===0)return json({error:'lines es requerido y no puede estar vacío'},400)
    if(lines.length>50)return json({error:'Demasiadas líneas en el carrito'},400)
    for(const line of lines){
      if(!line||typeof line.variantId!=='string'||!line.variantId.trim())return json({error:'Cada línea requiere variantId'},400)
      if(!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>20)return json({error:'quantity inválida para '+line.variantId},400)
    }
    const checkoutContext=parseCheckoutContext(body?.checkoutContext)
    if(!checkoutContext)return json({error:'checkoutContext inválido (purchaseMethod/shippingRegion)'},400)
    if(!shopifyConfigured(env))return json({error:'Shopify no está configurado'},503)

    const ids:string[]=[...new Set<string>(lines.map((l:any)=>String(l.variantId)))]
    const placeholders=ids.map(()=>'?').join(',')
    const rows=(await env.DB.prepare(`SELECT v.id,v.shopify_variant_id,v.stock,p.shopify_product_id,p.status FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id IN (${placeholders})`).bind(...ids).all()).results||[]
    const found=new Map<string,any>(rows.map((r:any)=>[String(r.id),r]))
    const unknown=ids.filter(id=>!found.has(id))
    if(unknown.length)return json({error:'Variantes locales desconocidas: '+unknown.join(', ')},400)
    const unmapped=ids.filter(id=>!found.get(id)?.shopify_variant_id||!found.get(id)?.shopify_product_id)
    if(unmapped.length)return json({error:'Variantes sin mapping de Shopify: '+unmapped.join(', ')},409)

    // A cartCreate response may contain a checkout URL even for an out-of-stock
    // merchandise ID. Verify live Storefront availability before creating a cart.
    let live:Map<string,any>
    try{live=await shopifyFetchOverlay(env,[...new Set<string>(rows.map((r:any)=>String(r.shopify_product_id)))])}
    catch(error){console.error('Shopify checkout availability check failed',error);return json({error:'No fue posible verificar disponibilidad en Shopify'},503)}
    const requested=new Map<string,number>()
    for(const line of lines)requested.set(line.variantId,(requested.get(line.variantId)||0)+line.quantity)
    for(const id of ids){
      const row:any=found.get(id)
      const variant=live.get(row.shopify_product_id)?.variants.find((v:any)=>v.id===toVariantGid(row.shopify_variant_id))
      if(row.status!=='active'||!variant?.availableForSale)return json({error:'Variante no disponible: '+id},409)
      // Null D1 stock denotes untracked inventory; Shopify still controls its
      // availableForSale flag, but its numeric quantity can be a stale default.
      if(row.stock!==null&&(variant.quantityAvailable==null||variant.quantityAvailable<(requested.get(id)||0)))return json({error:'Stock insuficiente: '+id},409)
    }

    const shopifyLines=lines.map((l:any)=>({merchandiseId:toVariantGid(String(found.get(String(l.variantId)).shopify_variant_id)),quantity:l.quantity}))
    const buyerIp=request.headers.get('cf-connecting-ip')
    const siteRow=await env.DB.prepare('SELECT shipping_copy FROM site_settings WHERE id="default"').first()
    const terms=parseCommercialTerms(siteRow?.shipping_copy as string|null|undefined)
    const attributes=cartAttributesFor(terms,checkoutContext)
    try{
      const {cartId,checkoutUrl}=await shopifyCartCreate(env,shopifyLines,buyerIp,attributes)
      return json({cartId,checkoutUrl},200)
    }catch(error){
      if(error instanceof ShopifyUserError)return json({error:error.message},400)
      return json({error:error instanceof Error?error.message:'Error creando el carrito de Shopify'},502)
    }
  }

  if(request.method==='GET'&&path.startsWith('/api/media/')){
    const id=decodeURIComponent(path.slice('/api/media/'.length))
    const row=await env.DB.prepare('SELECT * FROM product_media WHERE id=?').bind(id).first()
    if(!row)return new Response('Not found',{status:404})
    if(row.r2_key){
      const object=await env.MEDIA.get(row.r2_key)
      if(!object)return new Response('Not found',{status:404})
      const headers=new Headers();object.writeHttpMetadata(headers);headers.set('etag',object.httpEtag);headers.set('Cache-Control','public, max-age=31536000, immutable')
      return new Response(object.body,{headers})
    }
    if(row.public_url)return Response.redirect(row.public_url,302)
    return new Response('Not found',{status:404})
  }
  if(request.method==='GET'&&path.startsWith('/api/site-media/')){
    const key=decodeURIComponent(path.slice('/api/site-media/'.length))
    const object=await env.MEDIA.get(key)
    if(!object)return new Response('Not found',{status:404})
    const headers=new Headers();object.writeHttpMetadata(headers);headers.set('etag',object.httpEtag);headers.set('Cache-Control','public, max-age=31536000, immutable')
    return new Response(object.body,{headers})
  }

  if(path.startsWith('/api/panel/'))return handlePanelApi(request,env,path)
  if(path.startsWith('/api/demo/'))return handleDemoApi(request,path,env)

  if(!path.startsWith('/api/admin/'))return json({error:'Not found'},404)
  const admin=await requireAdmin(request,env,ctx)
  return adminRoutes(request,env,path,admin)
}

// The CMS endpoints. Reached from /api/admin/* (Cloudflare Access, Nexo) and /api/panel/* (client session, rewritten to /api/admin/*).
async function adminRoutes(request:Request,env:Env,path:string,admin:{email:string|null}){
  if(request.method==='GET'&&path==='/api/admin/session')return json({email:admin.email})
  if(request.method==='GET'&&path==='/api/admin/catalog')return json(await getCatalog(env,true))

  const productMatch=path.match(/^\/api\/admin\/products\/([^/]+)$/)
  if(productMatch&&request.method==='PUT'){
    const saved=await saveProduct(env,await parseJson(request));await audit(env,admin.email,'product.save','product',productMatch[1]);return json(saved)
  }
  const statusMatch=path.match(/^\/api\/admin\/products\/([^/]+)\/status$/)
  if(statusMatch&&request.method==='PATCH'){
    const {status}=await parseJson<any>(request);if(!['draft','active','hidden','archived'].includes(status))return json({error:'Estado inválido'},400)
    await env.DB.prepare('UPDATE products SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(status,statusMatch[1]).run();await audit(env,admin.email,'product.status','product',statusMatch[1]);return json({ok:true})
  }
  const duplicateMatch=path.match(/^\/api\/admin\/products\/([^/]+)\/duplicate$/)
  if(duplicateMatch&&request.method==='POST'){
    const catalog=await getCatalog(env,true);const source=catalog.products.find((x:any)=>x.id===duplicateMatch[1]);if(!source)return json({error:'Producto no encontrado'},404)
    const id=crypto.randomUUID();const copy={...source,id,slug:source.slug+'-copy-'+Date.now(),name:source.name+' COPY',status:'draft',variants:source.variants.map((v:any)=>({...v,id:crypto.randomUUID(),productId:id})),media:[]}
    await saveProduct(env,{product:copy,collectionIds:source.collections.map((c:any)=>c.id)})
    for(const m of source.media){await env.DB.prepare('INSERT INTO product_media(id,product_id,media_type,r2_key,public_url,alt,sort_order) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,m.mediaType,m.storagePath||null,m.storagePath?null:m.publicUrl,m.alt,m.sortOrder).run()}
    await audit(env,admin.email,'product.duplicate','product',id);return json({id})
  }

  const mediaUpload=path.match(/^\/api\/admin\/products\/([^/]+)\/media$/)
  if(mediaUpload&&request.method==='POST'){
    const form=await request.formData();const file=form.get('file');if(!(file instanceof File))return json({error:'Archivo requerido'},400)
    const mediaType=String(form.get('mediaType')||'hero');const alt=String(form.get('alt')||'');const id=crypto.randomUUID();const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');const key=mediaUpload[1]+'/'+id+'-'+safe
    await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type||'application/octet-stream'}})
    const last=await env.DB.prepare('SELECT COALESCE(MAX(sort_order),0) AS n FROM product_media WHERE product_id=?').bind(mediaUpload[1]).first()
    await env.DB.prepare('INSERT INTO product_media(id,product_id,media_type,r2_key,public_url,alt,sort_order) VALUES(?,?,?,?,?,?,?)').bind(id,mediaUpload[1],mediaType,key,null,alt,Number(last?.n||0)+1).run()
    await audit(env,admin.email,'media.upload','product_media',id);return json({id},201)
  }
  const mediaDelete=path.match(/^\/api\/admin\/media\/([^/]+)$/)
  if(mediaDelete&&request.method==='DELETE'){
    const row=await env.DB.prepare('SELECT * FROM product_media WHERE id=?').bind(mediaDelete[1]).first();if(!row)return json({error:'Media no encontrado'},404)
    await env.DB.prepare('DELETE FROM product_media WHERE id=?').bind(mediaDelete[1]).run()
    if(row.r2_key){const refs=await env.DB.prepare('SELECT COUNT(*) AS n FROM product_media WHERE r2_key=?').bind(row.r2_key).first();if(Number(refs?.n||0)===0)await env.MEDIA.delete(row.r2_key)}
    await audit(env,admin.email,'media.delete','product_media',mediaDelete[1]);return json({ok:true})
  }
  if(path==='/api/admin/media/reorder'&&request.method==='POST'){
    const {ids}=await parseJson<any>(request);const statements=(ids||[]).map((id:string,i:number)=>env.DB.prepare('UPDATE product_media SET sort_order=? WHERE id=?').bind(i+1,id));if(statements.length)await env.DB.batch(statements);return json({ok:true})
  }
  if(path==='/api/admin/home/editorial-image'&&request.method==='POST'){
    const form=await request.formData();const file=form.get('file')
    if(!(file instanceof File))return json({error:'Archivo requerido'},400)
    if(!file.type.startsWith('image/'))return json({error:'Solo se permiten imágenes.'},400)
    if(file.size>10*1024*1024)return json({error:'La imagen supera 10 MB.'},400)
    const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-')
    const key='home/editorial/'+crypto.randomUUID()+'-'+safe
    await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type||'application/octet-stream'}})
    const url='/api/site-media/'+encodeURIComponent(key)
    await audit(env,admin.email,'home.editorial.upload','homepage','default')
    return json({url},201)
  }
  if(path==='/api/admin/home'&&request.method==='PUT'){
    const h=await parseJson<any>(request)
    await env.DB.prepare(`UPDATE homepage_settings SET hero_product_id=?,hero_secondary_product_id=?,hero_headline=?,hero_subheadline=?,featured_product_ids_json=?,fragrance_primary_id=?,fragrance_secondary_id=?,editorial_product_id=?,editorial_image_url=?,updated_at=CURRENT_TIMESTAMP WHERE id='default'`)
      .bind(h.heroProductId||null,h.heroSecondaryProductId||null,h.heroHeadline||'',h.heroSubheadline||'',JSON.stringify(h.featuredProductIds||[]),h.fragrancePrimaryId||null,h.fragranceSecondaryId||null,h.editorialProductId||null,h.editorialImageUrl||null).run()
    await audit(env,admin.email,'home.save','homepage','default');return json({ok:true})
  }
  if(path==='/api/admin/settings'&&request.method==='PUT'){
    const s=await parseJson<any>(request)
    await env.DB.prepare(`UPDATE site_settings SET brand_name=?,logo_url=?,instagram=?,whatsapp=?,email=?,shipping_copy=?,changes_copy=?,advisory_copy=?,store_status=?,shopify_enabled=?,preview_noindex=?,updated_at=CURRENT_TIMESTAMP WHERE id='default'`)
      .bind(s.brandName||null,s.logoUrl||null,s.instagram||null,s.whatsapp||null,s.email||null,s.shippingCopy||null,s.changesCopy||null,s.advisoryCopy||null,s.storeStatus||'preview',s.shopifyEnabled?1:0,s.previewNoindex?1:0).run()
    await audit(env,admin.email,'settings.save','site','default');return json({ok:true})
  }
  const tax=path.match(/^\/api\/admin\/taxonomy\/(categories|collections|fits)$/)
  if(tax&&request.method==='PUT'){
    const t=tax[1];const row=await parseJson<any>(request);const id=row.id||crypto.randomUUID()
    await env.DB.prepare(`INSERT INTO ${t}(id,slug,name,enabled,sort_order,updated_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,name=excluded.name,enabled=excluded.enabled,sort_order=excluded.sort_order,updated_at=CURRENT_TIMESTAMP`).bind(id,row.slug,row.name,row.enabled===false?0:1,row.sortOrder||0).run()
    await audit(env,admin.email,'taxonomy.save',t,id);return json({id})
  }
  return json({error:'Not found'},404)
}

// Client panel API: authenticated only by an application session (never by the Access header, which anyone can forge on this path).
async function handlePanelApi(request:Request,env:Env,path:string){
  const blocked=rejectCrossOrigin(request);if(blocked)return blocked
  const rest=path.slice('/api/panel/'.length)
  if(request.method==='POST'&&rest==='login')return handleLogin(request,env,'panel')
  if(request.method==='POST'&&rest==='logout')return handleLogout(request,env,'panel')
  const user=await getSessionUser(env,request,'panel')
  if(!user)return json({error:'Sesión no válida.'},401)
  if(request.method==='GET'&&rest==='session')return json({email:user.username,username:user.username,mustChangePassword:user.mustChangePassword})
  if(request.method==='POST'&&rest==='change-password')return handleChangePassword(request,env,user)
  if(user.mustChangePassword)return json({error:'Debes cambiar tu contraseña antes de continuar.',code:'PASSWORD_CHANGE_REQUIRED'},403)
  return adminRoutes(request,env,'/api/admin/'+rest,{email:user.username})
}

// Demo API: serves a static fixture and has no code path that writes D1/R2 or reaches Shopify; every non-GET is refused before its body is read.
function demoCatalog(){
  const catalog=structuredClone(seedCatalog)
  catalog.site={...catalog.site,brandName:'EL PUNTO — DEMO',instagram:null,whatsapp:null,email:null,storeStatus:'preview',shopifyEnabled:false,previewNoindex:true}
  return catalog
}
async function handleDemoApi(request:Request,path:string,env:Env){
  const blocked=rejectCrossOrigin(request);if(blocked)return blocked
  const rest=path.slice('/api/demo/'.length)
  if(request.method==='POST'&&rest==='login')return handleLogin(request,env,'demo')
  if(request.method==='POST'&&rest==='logout')return handleLogout(request,env,'demo')
  const user=await getSessionUser(env,request,'demo')
  if(!user)return json({error:'Sesión no válida.'},401)
  if(request.method!=='GET'&&request.method!=='HEAD')return json({error:DEMO_MESSAGE,demo:true},403)
  if(rest==='session')return json({email:user.username,username:user.username,demo:true,mustChangePassword:false})
  if(rest==='catalog')return json(demoCatalog())
  return json({error:'Not found'},404)
}

const PRIVATE_SHELL=/^\/(panel|demo)(\/|$)/
// The SPA shell for /panel and /demo/*: never indexable, in the header and in the HTML itself.
async function servePrivateShell(request:Request,env:Env){
  const response=await env.ASSETS.fetch(request)
  const headers=new Headers(response.headers)
  headers.set('X-Robots-Tag','noindex, nofollow, noarchive')
  headers.set('Cache-Control','no-store')
  if(!(headers.get('content-type')||'').includes('text/html'))return new Response(response.body,{status:response.status,headers})
  const html=(await response.text())
    .replace(/(<meta name="robots" content=")[^"]*("\s*id="robots-meta">)/,'$1noindex,nofollow,noarchive$2')
    .replace(/(<meta name="googlebot" content=")[^"]*("\s*id="googlebot-meta">)/,'$1noindex,nofollow,noarchive$2')
  headers.delete('content-length');headers.delete('etag')
  return new Response(html,{status:response.status,headers})
}

export default {
  async fetch(request:Request,env:Env,ctx:AccessContext){
    try{
      const url=new URL(request.url)
      if(url.pathname.startsWith('/api/'))return await handleApi(request,env,ctx)
      if(PRIVATE_SHELL.test(url.pathname))return await servePrivateShell(request,env)
      return env.ASSETS.fetch(request)
    }catch(error){
      if(error instanceof Response)return error
      console.error(error)
      return json({error:error instanceof Error?error.message:'Error interno'},500)
    }
  }
}
