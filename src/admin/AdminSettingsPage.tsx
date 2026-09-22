import { useEffect, useState } from 'react'
import { fetchCatalog, saveSiteSettings, saveTaxonomy } from '../lib/catalogRepository'
import type { CatalogSnapshot, SiteSettings } from '../types'

type Taxonomy='categories'|'fits'|'collections'
export function AdminSettingsPage(){
  const [catalog,setCatalog]=useState<CatalogSnapshot|null>(null);const [site,setSite]=useState<SiteSettings|null>(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState<string|null>(null)
  async function load(){try{const c=await fetchCatalog(true);setCatalog(c);setSite(c.site)}catch(e){setMessage(e instanceof Error?e.message:'Error cargando ajustes')}}
  useEffect(()=>{void load()},[])
  async function save(){if(!site)return;setBusy(true);setMessage(null);try{await saveSiteSettings(site);setMessage('Ajustes guardados.')}catch(e){setMessage(e instanceof Error?e.message:'Error guardando ajustes')}finally{setBusy(false)}}
  async function addTaxonomy(table:Taxonomy,name:string){const clean=name.trim();if(!clean)return;setBusy(true);try{await saveTaxonomy(table,{id:crypto.randomUUID(),slug:clean.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''),name:clean,enabled:true,sortOrder:999});await load()}catch(e){setMessage(e instanceof Error?e.message:'Error guardando taxonomía')}finally{setBusy(false)}}
  async function toggle(table:Taxonomy,row:any){setBusy(true);try{await saveTaxonomy(table,{...row,enabled:!row.enabled});await load()}catch(e){setMessage(e instanceof Error?e.message:'Error actualizando taxonomía')}finally{setBusy(false)}}
  if(!catalog||!site)return <div className="admin-page">Cargando…</div>
  return <div className="admin-page"><header className="admin-page-head"><div><span>CMS / SETTINGS</span><h1>AJUSTES.</h1></div><button className="btn dark" disabled={busy} onClick={save}>GUARDAR</button></header>{message&&<div className="admin-notice">{message}</div>}
    <section className="admin-form-grid"><label>Nombre de marca<input value={site.brandName||''} onChange={e=>setSite({...site,brandName:e.target.value||null})}/></label><label>Logo URL<input value={site.logoUrl||''} onChange={e=>setSite({...site,logoUrl:e.target.value||null})}/></label><label>WhatsApp<input value={site.whatsapp||''} onChange={e=>setSite({...site,whatsapp:e.target.value||null})}/></label><label>Email<input type="email" value={site.email||''} onChange={e=>setSite({...site,email:e.target.value||null})}/></label><label>Instagram<input value={site.instagram||''} onChange={e=>setSite({...site,instagram:e.target.value||null})}/></label><label>Estado<select value={site.storeStatus} onChange={e=>setSite({...site,storeStatus:e.target.value})}><option value="preview">Preview</option><option value="live">Live</option></select></label><label className="wide">Envíos<textarea rows={3} value={site.shippingCopy||''} onChange={e=>setSite({...site,shippingCopy:e.target.value||null})}/></label><label className="wide">Cambios<textarea rows={3} value={site.changesCopy||''} onChange={e=>setSite({...site,changesCopy:e.target.value||null})}/></label><label className="wide">Asesoría<textarea rows={3} value={site.advisoryCopy||''} onChange={e=>setSite({...site,advisoryCopy:e.target.value||null})}/></label></section>
    <section className="admin-flags"><label><input type="checkbox" checked={site.previewNoindex} onChange={e=>setSite({...site,previewNoindex:e.target.checked})}/> Preview noindex</label><label><input type="checkbox" checked={site.shopifyEnabled} onChange={e=>setSite({...site,shopifyEnabled:e.target.checked})}/> Shopify enabled</label></section>
    <TaxonomyBlock title="CATEGORÍAS" table="categories" rows={catalog.categories} onAdd={addTaxonomy} onToggle={toggle}/>
    <TaxonomyBlock title="FITS" table="fits" rows={catalog.fits} onAdd={addTaxonomy} onToggle={toggle}/>
    <TaxonomyBlock title="COLECCIONES" table="collections" rows={catalog.collections} onAdd={addTaxonomy} onToggle={toggle}/>
  </div>
}

function TaxonomyBlock({title,table,rows,onAdd,onToggle}:{title:string;table:Taxonomy;rows:any[];onAdd:(table:Taxonomy,name:string)=>Promise<void>;onToggle:(table:Taxonomy,row:any)=>Promise<void>}){
  const [name,setName]=useState('')
  return <section className="admin-section"><div className="section-head"><h2>{title}</h2><form onSubmit={e=>{e.preventDefault();void onAdd(table,name).then(()=>setName(''))}}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nuevo"/><button>+ AGREGAR</button></form></div><div className="taxonomy-list">{rows.map(row=><div key={row.id}><span><b>{row.name}</b><small>{row.slug}</small></span><button onClick={()=>void onToggle(table,row)}>{row.enabled?'DESACTIVAR':'ACTIVAR'}</button></div>)}</div></section>
}
