import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { duplicateProduct, fetchCatalog, setProductStatus } from '../lib/catalogRepository'
import type { CatalogSnapshot } from '../types'
import { ImageWithFallback } from '../components/ImageWithFallback'

export function AdminProductsPage(){
  const [catalog,setCatalog]=useState<CatalogSnapshot|null>(null);const [error,setError]=useState<string|null>(null);const [busy,setBusy]=useState<string|null>(null)
  async function load(){try{setCatalog(await fetchCatalog(true));setError(null)}catch(e){setError(e instanceof Error?e.message:'Error cargando productos')}}
  useEffect(()=>{void load()},[])
  async function status(id:string,next:'active'|'hidden'|'archived'|'draft'){setBusy(id);try{await setProductStatus(id,next);await load()}catch(e){setError(e instanceof Error?e.message:'Error guardando estado')}finally{setBusy(null)}}
  async function duplicate(id:string){const p=catalog?.products.find(x=>x.id===id);if(!p)return;setBusy(id);try{await duplicateProduct(p);await load()}catch(e){setError(e instanceof Error?e.message:'Error duplicando producto')}finally{setBusy(null)}}
  return <div className="admin-page"><header className="admin-page-head"><div><span>CMS / PRODUCTOS</span><h1>CATÁLOGO.</h1></div><Link className="btn dark" to="/admin/products/new">+ CREAR PRODUCTO</Link></header>{error&&<div className="admin-warning">{error}</div>}
    <div className="admin-product-list">{catalog?.products.map(p=><article key={p.id}><ImageWithFallback src={p.media[0]?.publicUrl} alt={p.name}/><div><b>{p.name}</b><small>{p.category} / {p.fit||'—'}</small></div><span className={'status '+p.status}>{p.status}</span><div className="admin-row-actions"><Link to={'/admin/products/'+p.id}>EDITAR</Link><button disabled={busy===p.id} onClick={()=>duplicate(p.id)}>DUPLICAR</button><button disabled={busy===p.id} onClick={()=>status(p.id,p.status==='active'?'hidden':'active')}>{p.status==='active'?'OCULTAR':'ACTIVAR'}</button><button disabled={busy===p.id} onClick={()=>status(p.id,'archived')}>ARCHIVAR</button></div></article>)}</div>
  </div>
}
