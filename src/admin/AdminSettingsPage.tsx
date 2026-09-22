import { useEffect, useState } from 'react'
import { fetchCatalog, saveSiteSettings, saveTaxonomy } from '../lib/catalogRepository'
import type { CatalogSnapshot, SiteSettings } from '../types'

type Taxonomy='categories'|'fits'|'collections'
type SaveState='idle'|'dirty'|'saving'|'saved'|'error'

export function AdminSettingsPage(){
  const [catalog,setCatalog]=useState<CatalogSnapshot|null>(null);const [site,setSite]=useState<SiteSettings|null>(null);const [baseline,setBaseline]=useState('');const [saveState,setSaveState]=useState<SaveState>('idle');const [message,setMessage]=useState<string|null>(null)
  async function load(){try{const c=await fetchCatalog(true);setCatalog(c);setSite(c.site);setBaseline(JSON.stringify(c.site));setMessage(null)}catch(e){setMessage(e instanceof Error?e.message:'Error cargando ajustes');setSaveState('error')}}
  useEffect(()=>{void load()},[])
  const dirty=site?JSON.stringify(site)!==baseline:false
  useEffect(()=>{if(dirty&&saveState!=='saving')setSaveState('dirty')},[dirty])
  function patch(next:Partial<SiteSettings>){setSite(s=>s?{...s,...next}:s)}
  async function save(){if(!site)return;setSaveState('saving');setMessage(null);try{await saveSiteSettings(site);setBaseline(JSON.stringify(site));setSaveState('saved');setMessage('Ajustes guardados.');window.setTimeout(()=>setSaveState('idle'),1800)}catch(e){setMessage(e instanceof Error?e.message:'Error guardando ajustes');setSaveState('error')}}
  async function addTaxonomy(table:Taxonomy,name:string){const clean=name.trim();if(!clean)return;try{await saveTaxonomy(table,{id:crypto.randomUUID(),slug:clean.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''),name:clean,enabled:true,sortOrder:999});await load()}catch(e){setMessage(e instanceof Error?e.message:'Error guardando taxonomía')}}
  async function toggle(table:Taxonomy,row:any){try{await saveTaxonomy(table,{...row,enabled:!row.enabled});await load()}catch(e){setMessage(e instanceof Error?e.message:'Error actualizando taxonomía')}}
  if(!catalog||!site)return <div className="admin-page">Cargando…</div>
  return <div className="admin-page"><header className="admin-page-head"><div><span>CMS / AJUSTES</span><h1>AJUSTES.</h1><p>Datos generales de tienda y textos de servicio.</p></div><button className="btn dark" disabled={!dirty||saveState==='saving'} onClick={save}>{saveState==='saving'?'GUARDANDO…':saveState==='saved'?'GUARDADO ✓':'GUARDAR'}</button></header>{message&&<div className={saveState==='error'?'admin-warning':'admin-notice'}>{message}</div>}
    <section className="admin-form-grid"><label>Nombre de marca<input value={site.brandName||''} onChange={e=>patch({brandName:e.target.value||null})}/></label><label>Logo URL<input value={site.logoUrl||''} onChange={e=>patch({logoUrl:e.target.value||null})}/></label><label>WhatsApp<input value={site.whatsapp||''} onChange={e=>patch({whatsapp:e.target.value||null})}/></label><label>Email<input type="email" value={site.email||''} onChange={e=>patch({email:e.target.value||null})}/></label><label>Instagram<input value={site.instagram||''} onChange={e=>patch({instagram:e.target.value||null})}/></label><label>Estado de tienda<select value={site.storeStatus} onChange={e=>patch({storeStatus:e.target.value})}><option value="preview">Preview</option><option value="live">Live</option></select></label><label className="wide">Envíos<textarea rows={3} value={site.shippingCopy||''} onChange={e=>patch({shippingCopy:e.target.value||null})}/></label><label className="wide">Cambios<textarea rows={3} value={site.changesCopy||''} onChange={e=>patch({changesCopy:e.target.value||null})}/></label><label className="wide">Asesoría<textarea rows={3} value={site.advisoryCopy||''} onChange={e=>patch({advisoryCopy:e.target.value||null})}/></label></section>
    <section className="admin-flags"><label><input type="checkbox" checked={site.previewNoindex} onChange={e=>patch({previewNoindex:e.target.checked})}/> Evitar indexación en preview</label><label><input type="checkbox" checked={site.shopifyEnabled} onChange={e=>patch({shopifyEnabled:e.target.checked})}/> Integración Shopify habilitada</label></section>
    <TaxonomyBlock title="CATEGORÍAS" table="categories" rows={catalog.categories} onAdd={addTaxonomy} onToggle={toggle}/><TaxonomyBlock title="FITS" table="fits" rows={catalog.fits} onAdd={addTaxonomy} onToggle={toggle}/><TaxonomyBlock title="COLECCIONES" table="collections" rows={catalog.collections} onAdd={addTaxonomy} onToggle={toggle}/>
    <div className={'admin-savebar '+(dirty?'visible':'')}><span>{saveState==='saving'?'Guardando cambios…':'Cambios sin guardar'}</span><button className="btn dark" disabled={!dirty||saveState==='saving'} onClick={save}>GUARDAR CAMBIOS</button></div>
  </div>
}

function TaxonomyBlock({title,table,rows,onAdd,onToggle}:{title:string;table:Taxonomy;rows:any[];onAdd:(table:Taxonomy,name:string)=>Promise<void>;onToggle:(table:Taxonomy,row:any)=>Promise<void>}){
  const [name,setName]=useState('')
  return <section className="admin-section"><div className="section-head"><h2>{title}</h2><form onSubmit={e=>{e.preventDefault();void onAdd(table,name).then(()=>setName(''))}}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nuevo"/><button>+ AGREGAR</button></form></div><div className="taxonomy-list">{rows.map(row=><div key={row.id}><span><b>{row.name}</b><small>{row.slug}</small></span><button onClick={()=>void onToggle(table,row)}>{row.enabled?'DESACTIVAR':'ACTIVAR'}</button></div>)}</div></section>
}
