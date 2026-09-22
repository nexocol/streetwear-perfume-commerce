import { SCHEMA_SQL, SEED_SQL, SCHEMA_VERSION } from './server/schema'

type AccessIdentity={email?:string|null}
type AccessContext={access?:{getIdentity:()=>Promise<AccessIdentity|null>}}
type Env={
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
async function ensureDatabase(env:Env){
  if(ready)return
  try{
    await env.DB.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').first()
  }catch{
    await runSqlScript(env,SCHEMA_SQL)
  }
  const row=await env.DB.prepare('SELECT version FROM schema_migrations WHERE version=?').bind(SCHEMA_VERSION).first()
  if(!row){
    await runSqlScript(env,SEED_SQL)
    await env.DB.prepare('INSERT INTO schema_migrations(version) VALUES(?)').bind(SCHEMA_VERSION).run()
  }
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
    id:p.id,slug:p.slug,name:p.name,nameStatus:p.name_status,subtitle:p.subtitle,description:p.description,categoryId:p.category_id,category:p.category_name||'',fit:p.fit,color:p.color,
    price:p.price==null?null:Number(p.price),compareAtPrice:p.compare_at_price==null?null:Number(p.compare_at_price),featured:bool(p.featured),bestSeller:bool(p.best_seller),newArrival:bool(p.new_arrival),status:p.status,sortOrder:p.sort_order,
    shopifyProductId:p.shopify_product_id,shopifyHandle:p.shopify_handle,features:parseArray<string>(p.features_json),
    variants:(variantsBy.get(p.id)||[]).map((v:any)=>({id:v.id,productId:v.product_id,size:v.size,color:v.color,sku:v.sku,price:v.price==null?null:Number(v.price),stock:v.stock==null?null:Number(v.stock),available:bool(v.available),shopifyVariantId:v.shopify_variant_id,sortOrder:v.sort_order})),
    media:(mediaBy.get(p.id)||[]).map((m:any)=>({id:m.id,productId:m.product_id,mediaType:m.media_type,storagePath:m.r2_key,publicUrl:m.r2_key?'/api/media/'+encodeURIComponent(m.id):m.public_url,alt:m.alt,sortOrder:m.sort_order})),
    collections:(colsBy.get(p.id)||[]).map((c:any)=>({id:c.id,slug:c.slug,name:c.name,enabled:bool(c.enabled),sortOrder:c.sort_order}))
  }))
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
    env.DB.prepare(`INSERT INTO products(id,slug,name,name_status,subtitle,description,category_id,fit,color,price,compare_at_price,featured,best_seller,new_arrival,status,sort_order,features_json,shopify_product_id,shopify_handle,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,name=excluded.name,name_status=excluded.name_status,subtitle=excluded.subtitle,description=excluded.description,category_id=excluded.category_id,fit=excluded.fit,color=excluded.color,price=excluded.price,compare_at_price=excluded.compare_at_price,featured=excluded.featured,best_seller=excluded.best_seller,new_arrival=excluded.new_arrival,status=excluded.status,sort_order=excluded.sort_order,features_json=excluded.features_json,shopify_product_id=excluded.shopify_product_id,shopify_handle=excluded.shopify_handle,updated_at=CURRENT_TIMESTAMP`)
      .bind(p.id,p.slug,p.name,p.nameStatus||'provisional',p.subtitle||null,p.description||null,p.categoryId||null,p.fit||null,p.color||null,p.price??null,p.compareAtPrice??null,p.featured?1:0,p.bestSeller?1:0,p.newArrival?1:0,p.status||'draft',p.sortOrder||0,JSON.stringify(p.features||[]),p.shopifyProductId||null,p.shopifyHandle||null),
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

  if(!path.startsWith('/api/admin/'))return json({error:'Not found'},404)
  const admin=await requireAdmin(request,env,ctx)

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

export default {
  async fetch(request:Request,env:Env,ctx:AccessContext){
    try{
      const url=new URL(request.url)
      if(url.pathname.startsWith('/api/'))return await handleApi(request,env,ctx)
      return env.ASSETS.fetch(request)
    }catch(error){
      if(error instanceof Response)return error
      console.error(error)
      return json({error:error instanceof Error?error.message:'Error interno'},500)
    }
  }
}
