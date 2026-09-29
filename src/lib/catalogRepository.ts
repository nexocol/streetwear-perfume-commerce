import type { CatalogSnapshot, HomepageSettings, Product, ProductMedia, SiteSettings } from '../types'
import { seedCatalog } from '../data/seed'
import { adminApiBase } from '../admin/adminMode'

const allowFallback=import.meta.env.DEV||import.meta.env.VITE_ALLOW_SEED_FALLBACK==='true'

async function api<T>(path:string,init?:RequestInit):Promise<T>{
  const response=await fetch(path,{...init,headers:{...(init?.body instanceof FormData?{}:{'Content-Type':'application/json'}),...(init?.headers||{})},credentials:'same-origin'})
  if(!response.ok){
    let message='No fue posible completar la operación.'
    try{const body=await response.json() as any;message=body.error||message}catch{}
    throw new Error(message)
  }
  return response.json() as Promise<T>
}
// Admin calls follow the entrance the page was opened from: /api/admin, /api/panel or /api/demo.
const admin=(path:string)=>adminApiBase()+path

export async function fetchCatalog(includeInactive=false):Promise<CatalogSnapshot>{
  try{return await api<CatalogSnapshot>(includeInactive?admin('/catalog'):'/api/catalog')}
  catch(error){if(allowFallback&&!includeInactive)return structuredClone(seedCatalog);throw error}
}

export async function saveProduct(product:Product,collectionIds:string[]):Promise<Product>{
  return api<Product>(admin('/products/'+encodeURIComponent(product.id)),{method:'PUT',body:JSON.stringify({product,collectionIds})})
}

export async function createBlankProduct():Promise<Product>{
  const id=crypto.randomUUID()
  return {id,slug:'product-'+Date.now(),name:'NUEVO PRODUCTO',nameStatus:'provisional',subtitle:'',description:'',categoryId:null,category:'',fit:null,color:null,fragranceFamily:null,price:null,compareAtPrice:null,featured:false,bestSeller:false,newArrival:true,status:'draft',sortOrder:999,shopifyProductId:null,shopifyHandle:null,features:[],variants:[],media:[],collections:[]}
}

export async function duplicateProduct(source:Product):Promise<string>{
  const result=await api<{id:string}>(admin('/products/'+encodeURIComponent(source.id)+'/duplicate'),{method:'POST'})
  return result.id
}
export async function setProductStatus(id:string,status:'active'|'hidden'|'archived'|'draft'){
  await api(admin('/products/'+encodeURIComponent(id)+'/status'),{method:'PATCH',body:JSON.stringify({status})})
}
export async function saveHomepage(home:HomepageSettings){await api(admin('/home'),{method:'PUT',body:JSON.stringify(home)})}
export async function uploadHomepageEditorialImage(file:File){
  const form=new FormData();form.set('file',file)
  return api<{url:string}>(admin('/home/editorial-image'),{method:'POST',body:form})
}
export async function saveSiteSettings(site:SiteSettings){await api(admin('/settings'),{method:'PUT',body:JSON.stringify(site)})}
export async function saveTaxonomy(table:'categories'|'collections'|'fits',row:any){await api(admin('/taxonomy/'+table),{method:'PUT',body:JSON.stringify(row)})}
export async function uploadProductMedia(productId:string,file:File,mediaType:string,alt:string){
  const form=new FormData();form.set('file',file);form.set('mediaType',mediaType);form.set('alt',alt)
  await api(admin('/products/'+encodeURIComponent(productId)+'/media'),{method:'POST',body:form})
}
export async function deleteProductMedia(media:ProductMedia){await api(admin('/media/'+encodeURIComponent(media.id)),{method:'DELETE'})}
export async function reorderProductMedia(items:ProductMedia[]){await api(admin('/media/reorder'),{method:'POST',body:JSON.stringify({ids:items.map(x=>x.id)})})}
export type AdminSessionInfo={email:string|null;mustChangePassword?:boolean}
// The Cloudflare Access entrance keeps its explicit endpoint; /panel and /demo/panel use their own namespace.
export async function getAdminSession(){return api<AdminSessionInfo>(adminApiBase()==='/api/admin'?'/api/admin/session':admin('/session'))}

export async function adminLogin(username:string,password:string){
  return api<{ok:true;mustChangePassword:boolean}>(admin('/login'),{method:'POST',body:JSON.stringify({username,password})})
}
export async function adminLogout(){await api(admin('/logout'),{method:'POST'})}
export async function changeAdminPassword(newPassword:string,confirmPassword:string){
  await api(admin('/change-password'),{method:'POST',body:JSON.stringify({newPassword,confirmPassword})})
}
