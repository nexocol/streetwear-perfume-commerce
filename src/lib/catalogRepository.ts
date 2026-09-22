import { supabase, isSupabaseConfigured } from './supabase'
import { seedCatalog } from '../data/seed'
import type { CatalogSnapshot, Category, Collection, Fit, HomepageSettings, Product, ProductMedia, SiteSettings, Variant } from '../types'

const allowFallback=import.meta.env.DEV||import.meta.env.VITE_ALLOW_SEED_FALLBACK==='true'

function mapVariant(row:any):Variant{
  return {id:row.id,productId:row.product_id,size:row.size,color:row.color,sku:row.sku,price:row.price==null?null:Number(row.price),stock:row.stock,available:row.available,shopifyVariantId:row.shopify_variant_id,sortOrder:row.sort_order??0}
}
function mapMedia(row:any):ProductMedia{
  return {id:row.id,productId:row.product_id,mediaType:row.media_type,storagePath:row.storage_path,publicUrl:row.public_url,alt:row.alt,sortOrder:row.sort_order??0}
}
function mapCollection(row:any):Collection{
  return {id:row.id,slug:row.slug,name:row.name,enabled:row.enabled,sortOrder:row.sort_order??0}
}
function mapProduct(row:any):Product{
  const linked=(row.product_collections||[]).map((x:any)=>x.collection).filter(Boolean).map(mapCollection)
  return {
    id:row.id,slug:row.slug,name:row.name,nameStatus:row.name_status||'final',subtitle:row.subtitle,description:row.description,
    categoryId:row.category_id,category:row.category?.name||'',fit:row.fit,color:row.color,
    price:row.price==null?null:Number(row.price),compareAtPrice:row.compare_at_price==null?null:Number(row.compare_at_price),
    featured:row.featured,bestSeller:row.best_seller,newArrival:row.new_arrival,status:row.status,sortOrder:row.sort_order??0,
    shopifyProductId:row.shopify_product_id,shopifyHandle:row.shopify_handle,features:row.features||[],
    variants:(row.variants||[]).sort((a:any,b:any)=>(a.sort_order??0)-(b.sort_order??0)).map(mapVariant),
    media:(row.product_media||[]).sort((a:any,b:any)=>(a.sort_order??0)-(b.sort_order??0)).map(mapMedia),
    collections:linked,
  }
}

export async function fetchCatalog(includeInactive=false):Promise<CatalogSnapshot>{
  if(!supabase){
    if(allowFallback)return structuredClone(seedCatalog)
    throw new Error('Supabase no está configurado.')
  }
  let productsQuery=supabase.from('products').select('*, category:categories(*), variants(*), product_media(*), product_collections(collection:collections(*))').order('sort_order')
  if(!includeInactive)productsQuery=productsQuery.eq('status','active')
  const [productsRes,categoriesRes,collectionsRes,fitsRes,homeRes,siteRes]=await Promise.all([
    productsQuery,
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('collections').select('*').order('name'),
    supabase.from('fits').select('*').order('sort_order'),
    supabase.from('homepage_settings').select('*').limit(1).maybeSingle(),
    supabase.from('site_settings').select('*').limit(1).maybeSingle(),
  ])
  for(const res of [productsRes,categoriesRes,collectionsRes,fitsRes,homeRes,siteRes])if(res.error)throw res.error
  const categories=(categoriesRes.data||[]).map((r:any)=>({id:r.id,slug:r.slug,name:r.name,enabled:r.enabled,sortOrder:r.sort_order??0}))
  const collections=(collectionsRes.data||[]).map(mapCollection).sort((a,b)=>a.sortOrder-b.sortOrder)
  const fits=(fitsRes.data||[]).map((r:any)=>({id:r.id,slug:r.slug,name:r.name,enabled:r.enabled,sortOrder:r.sort_order??0}))
  const home:any=homeRes.data
  const site:any=siteRes.data
  return {
    products:(productsRes.data||[]).map(mapProduct),
    categories,
    collections,
    fits,
    homepage:home?{
      id:home.id,heroProductId:home.hero_product_id,heroSecondaryProductId:home.hero_secondary_product_id,heroHeadline:home.hero_headline,
      heroSubheadline:home.hero_subheadline,featuredProductIds:home.featured_product_ids||[],fragrancePrimaryId:home.fragrance_primary_id,
      fragranceSecondaryId:home.fragrance_secondary_id,editorialProductId:home.editorial_product_id,editorialImageUrl:home.editorial_image_url
    }:structuredClone(seedCatalog.homepage),
    site:site?{
      id:site.id,brandName:site.brand_name,logoUrl:site.logo_url,instagram:site.instagram,whatsapp:site.whatsapp,email:site.email,
      shippingCopy:site.shipping_copy,changesCopy:site.changes_copy,advisoryCopy:site.advisory_copy,storeStatus:site.store_status,
      shopifyEnabled:site.shopify_enabled,previewNoindex:site.preview_noindex
    }:structuredClone(seedCatalog.site)
  }
}

export async function saveProduct(product:Product,collectionIds:string[]):Promise<Product>{
  if(!supabase)throw new Error('Supabase no está configurado.')
  const payload={
    id:product.id||undefined,slug:product.slug,name:product.name,name_status:product.nameStatus,subtitle:product.subtitle,description:product.description,
    category_id:product.categoryId,fit:product.fit,color:product.color,price:product.price,compare_at_price:product.compareAtPrice,featured:product.featured,
    best_seller:product.bestSeller,new_arrival:product.newArrival,status:product.status,sort_order:product.sortOrder,shopify_product_id:product.shopifyProductId,
    shopify_handle:product.shopifyHandle,features:product.features,
  }
  const {data,error}=await supabase.from('products').upsert(payload).select().single()
  if(error)throw error
  const productId=data.id
  const existingVariants=product.variants.filter(v=>v.id&&!v.id.startsWith('temp-'))
  const currentIds=existingVariants.map(v=>v.id)
  const {data:dbVariants,error:variantReadError}=await supabase.from('variants').select('id').eq('product_id',productId)
  if(variantReadError)throw variantReadError
  const removed=(dbVariants||[]).map((x:any)=>x.id).filter((id:string)=>!currentIds.includes(id))
  if(removed.length){const {error:e}=await supabase.from('variants').delete().in('id',removed);if(e)throw e}
  for(const [index,v] of product.variants.entries()){
    const variantPayload={...(v.id&&!v.id.startsWith('temp-')?{id:v.id}:{}),product_id:productId,size:v.size,color:v.color,sku:v.sku,price:v.price,stock:v.stock,available:v.available,shopify_variant_id:v.shopifyVariantId,sort_order:index+1}
    const {error:e}=await supabase.from('variants').upsert(variantPayload);if(e)throw e
  }
  const {error:delCollections}=await supabase.from('product_collections').delete().eq('product_id',productId);if(delCollections)throw delCollections
  if(collectionIds.length){
    const {error:e}=await supabase.from('product_collections').insert(collectionIds.map(collection_id=>({product_id:productId,collection_id})));if(e)throw e
  }
  const snapshot=await fetchCatalog(true)
  const saved=snapshot.products.find(p=>p.id===productId)
  if(!saved)throw new Error('No fue posible leer el producto guardado.')
  return saved
}

export async function createBlankProduct():Promise<Product>{
  const id=crypto.randomUUID()
  return {id,slug:`product-${Date.now()}`,name:'NUEVO PRODUCTO',nameStatus:'provisional',subtitle:'',description:'',categoryId:null,category:'',fit:null,color:null,price:null,compareAtPrice:null,featured:false,bestSeller:false,newArrival:true,status:'draft',sortOrder:999,shopifyProductId:null,shopifyHandle:null,features:[],variants:[],media:[],collections:[]}
}

export async function duplicateProduct(source:Product):Promise<string>{
  if(!supabase)throw new Error('Supabase no está configurado.')
  const copy={...source,id:crypto.randomUUID(),slug:`${source.slug}-copy-${Date.now()}`,name:`${source.name} COPY`,status:'draft' as const,variants:source.variants.map((v,i)=>({...v,id:`temp-${i}`,productId:'',shopifyVariantId:null})),media:[],shopifyProductId:null,shopifyHandle:null}
  const saved=await saveProduct(copy,source.collections.map(c=>c.id))
  for(const m of source.media){
    const {error}=await supabase.from('product_media').insert({product_id:saved.id,media_type:m.mediaType,storage_path:m.storagePath,public_url:m.publicUrl,alt:m.alt,sort_order:m.sortOrder})
    if(error)throw error
  }
  return saved.id
}

export async function setProductStatus(id:string,status:'active'|'hidden'|'archived'|'draft'){
  if(!supabase)throw new Error('Supabase no está configurado.')
  const {error}=await supabase.from('products').update({status}).eq('id',id);if(error)throw error
}

export async function saveHomepage(home:HomepageSettings){
  if(!supabase)throw new Error('Supabase no está configurado.')
  const payload={id:home.id,hero_product_id:home.heroProductId,hero_secondary_product_id:home.heroSecondaryProductId,hero_headline:home.heroHeadline,hero_subheadline:home.heroSubheadline,featured_product_ids:home.featuredProductIds,fragrance_primary_id:home.fragrancePrimaryId,fragrance_secondary_id:home.fragranceSecondaryId,editorial_product_id:home.editorialProductId,editorial_image_url:home.editorialImageUrl}
  const {error}=await supabase.from('homepage_settings').upsert(payload);if(error)throw error
}

export async function saveSiteSettings(site:SiteSettings){
  if(!supabase)throw new Error('Supabase no está configurado.')
  const payload={id:site.id,brand_name:site.brandName,logo_url:site.logoUrl,instagram:site.instagram,whatsapp:site.whatsapp,email:site.email,shipping_copy:site.shippingCopy,changes_copy:site.changesCopy,advisory_copy:site.advisoryCopy,store_status:site.storeStatus,shopify_enabled:site.shopifyEnabled,preview_noindex:site.previewNoindex}
  const {error}=await supabase.from('site_settings').upsert(payload);if(error)throw error
}

export async function saveTaxonomy(table:'categories'|'collections'|'fits',row:any){
  if(!supabase)throw new Error('Supabase no está configurado.')
  const payload={...row,id:row.id||undefined,sort_order:row.sortOrder}
  delete payload.sortOrder
  const {error}=await supabase.from(table).upsert(payload);if(error)throw error
}

export async function uploadProductMedia(productId:string,file:File,mediaType:string,alt:string){
  if(!supabase)throw new Error('Supabase no está configurado.')
  const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-')
  const path=`${productId}/${crypto.randomUUID()}-${safe}`
  const {error:uploadError}=await supabase.storage.from('product-media').upload(path,file,{cacheControl:'31536000',upsert:false})
  if(uploadError)throw uploadError
  const {data:urlData}=supabase.storage.from('product-media').getPublicUrl(path)
  const {data:maxRow,error:maxError}=await supabase.from('product_media').select('sort_order').eq('product_id',productId).order('sort_order',{ascending:false}).limit(1).maybeSingle()
  if(maxError)throw maxError
  const {error}=await supabase.from('product_media').insert({product_id:productId,media_type:mediaType,storage_path:path,public_url:urlData.publicUrl,alt,sort_order:(maxRow?.sort_order||0)+1})
  if(error)throw error
}

export async function deleteProductMedia(media:ProductMedia){
  if(!supabase)throw new Error('Supabase no está configurado.')
  if(media.storagePath){const {error:e}=await supabase.storage.from('product-media').remove([media.storagePath]);if(e)throw e}
  const {error}=await supabase.from('product_media').delete().eq('id',media.id);if(error)throw error
}

export async function reorderProductMedia(items:ProductMedia[]){
  if(!supabase)throw new Error('Supabase no está configurado.')
  for(const [index,item] of items.entries()){const {error}=await supabase.from('product_media').update({sort_order:index+1}).eq('id',item.id);if(error)throw error}
}

export async function isCurrentUserAdmin():Promise<boolean>{
  if(!supabase)return false
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return false
  const {data,error}=await supabase.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle()
  if(error)return false
  return Boolean(data)
}

export { isSupabaseConfigured }
