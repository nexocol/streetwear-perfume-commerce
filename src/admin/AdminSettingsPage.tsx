import { useEffect, useState } from 'react'
import { fetchCatalog, saveSiteSettings, saveTaxonomy } from '../lib/catalogRepository'
import type { CatalogSnapshot, SiteSettings } from '../types'
import { DEFAULT_COMMERCIAL_TERMS, parseCommercialTerms, serializeCommercialTerms, type CommercialTerms } from '../lib/clientContent'

type Taxonomy='categories'|'fits'|'collections'
type SaveState='idle'|'dirty'|'saving'|'saved'|'error'

export function AdminSettingsPage(){
  const [catalog,setCatalog]=useState<CatalogSnapshot|null>(null)
  const [site,setSite]=useState<SiteSettings|null>(null)
  const [terms,setTerms]=useState<CommercialTerms>({...DEFAULT_COMMERCIAL_TERMS})
  const [baseline,setBaseline]=useState('')
  const [saveState,setSaveState]=useState<SaveState>('idle')
  const [message,setMessage]=useState<string|null>(null)

  function snapshot(s:SiteSettings,t:CommercialTerms){return JSON.stringify({site:{...s,shippingCopy:null},terms:t})}
  async function load(){try{const c=await fetchCatalog(true);const t=parseCommercialTerms(c.site.shippingCopy);setCatalog(c);setSite(c.site);setTerms(t);setBaseline(snapshot(c.site,t));setMessage(null)}catch(e){setMessage(e instanceof Error?e.message:'Error cargando ajustes');setSaveState('error')}}
  useEffect(()=>{void load()},[])
  const dirty=site?snapshot(site,terms)!==baseline:false
  useEffect(()=>{if(dirty&&saveState!=='saving')setSaveState('dirty')},[dirty])
  function patch(next:Partial<SiteSettings>){setSite(s=>s?{...s,...next}:s)}
  function patchTerms(next:Partial<CommercialTerms>){setTerms(t=>({...t,...next}))}
  async function save(){
    if(!site)return;setSaveState('saving');setMessage(null)
    try{const next={...site,shippingCopy:serializeCommercialTerms(terms)};await saveSiteSettings(next);setSite(next);setBaseline(snapshot(next,terms));setSaveState('saved');setMessage('Ajustes guardados.');window.setTimeout(()=>setSaveState('idle'),1800)}
    catch(e){setMessage(e instanceof Error?e.message:'Error guardando ajustes');setSaveState('error')}
  }
  async function addTaxonomy(table:Taxonomy,name:string){const clean=name.trim();if(!clean)return;try{await saveTaxonomy(table,{id:crypto.randomUUID(),slug:clean.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''),name:clean,enabled:true,sortOrder:999});await load()}catch(e){setMessage(e instanceof Error?e.message:'Error guardando taxonomía')}}
  async function toggle(table:Taxonomy,row:any){try{await saveTaxonomy(table,{...row,enabled:!row.enabled});await load()}catch(e){setMessage(e instanceof Error?e.message:'Error actualizando taxonomía')}}

  if(!catalog||!site)return <div className="admin-page">Cargando…</div>
  return <div className="admin-page"><header className="admin-page-head"><div><span>CMS / AJUSTES</span><h1>AJUSTES.</h1><p>Datos generales, condiciones comerciales, categorías y estilos de la tienda.</p></div><button className="btn dark" disabled={!dirty||saveState==='saving'} onClick={save}>{saveState==='saving'?'GUARDANDO…':saveState==='saved'?'GUARDADO ✓':'GUARDAR'}</button></header>{message&&<div className={saveState==='error'?'admin-warning':'admin-notice'}>{message}</div>}
    <section className="admin-form-grid"><label>Nombre de marca<input value={site.brandName||''} onChange={e=>patch({brandName:e.target.value||null})}/></label><label>Logo URL<input value={site.logoUrl||''} onChange={e=>patch({logoUrl:e.target.value||null})}/></label><label>WhatsApp<input value={site.whatsapp||''} onChange={e=>patch({whatsapp:e.target.value||null})}/></label><label>Email<input type="email" value={site.email||''} onChange={e=>patch({email:e.target.value||null})}/></label><label>Instagram<input value={site.instagram||''} onChange={e=>patch({instagram:e.target.value||null})}/></label><label>Estado de tienda<select value={site.storeStatus} onChange={e=>patch({storeStatus:e.target.value})}><option value="preview">Preview</option><option value="live">Live</option></select></label><label className="wide">Cambios<textarea rows={3} value={site.changesCopy||''} onChange={e=>patch({changesCopy:e.target.value||null})}/></label><label className="wide">Asesoría<textarea rows={3} value={site.advisoryCopy||''} onChange={e=>patch({advisoryCopy:e.target.value||null})}/></label></section>

    <section className="admin-section commercial-admin"><div className="section-head"><div><span>COMERCIAL</span><h2>ENVÍOS Y MÉTODOS DE PAGO</h2></div><small>Editable sin cambiar la arquitectura</small></div>
      <div className="commercial-admin-grid">
        <article><h3>Pago contra entrega</h3><label>Mensaje<textarea rows={3} value={terms.codMessage} onChange={e=>patchTerms({codMessage:e.target.value})}/></label><div className="commercial-price-grid"><label>Bogotá<input type="number" value={terms.codBogota} onChange={e=>patchTerms({codBogota:Number(e.target.value)})}/></label><label>Cundinamarca<input type="number" value={terms.codCundinamarca} onChange={e=>patchTerms({codCundinamarca:Number(e.target.value)})}/></label><label>Resto del país<input type="number" value={terms.codNational} onChange={e=>patchTerms({codNational:Number(e.target.value)})}/></label></div></article>
        <article><h3>Pago anticipado</h3><label>Mensaje<textarea rows={3} value={terms.prepaidMessage} onChange={e=>patchTerms({prepaidMessage:e.target.value})}/></label><label>Costo de envío<input type="number" value={terms.prepaidShipping} onChange={e=>patchTerms({prepaidShipping:Number(e.target.value)})}/></label></article>
        <article><h3>Recoger en bodega</h3><label>Mensaje<textarea rows={4} value={terms.pickupMessage} onChange={e=>patchTerms({pickupMessage:e.target.value})}/></label></article>
      </div>
    </section>

    <section className="admin-flags"><label><input type="checkbox" checked={site.previewNoindex} onChange={e=>patch({previewNoindex:e.target.checked})}/> Evitar indexación en preview</label><label><input type="checkbox" checked={site.shopifyEnabled} onChange={e=>patch({shopifyEnabled:e.target.checked})}/> Integración Shopify habilitada</label></section>
    <TaxonomyBlock title="CATEGORÍAS" table="categories" rows={catalog.categories} onAdd={addTaxonomy} onToggle={toggle}/><TaxonomyBlock title="ESTILOS / SUBTIPOS" table="fits" rows={catalog.fits} onAdd={addTaxonomy} onToggle={toggle}/><TaxonomyBlock title="COLECCIONES" table="collections" rows={catalog.collections} onAdd={addTaxonomy} onToggle={toggle}/>
    <div className={'admin-savebar '+(dirty?'visible':'')}><span>{saveState==='saving'?'Guardando cambios…':'Cambios sin guardar'}</span><button className="btn dark" disabled={!dirty||saveState==='saving'} onClick={save}>GUARDAR CAMBIOS</button></div>
  </div>
}

function TaxonomyBlock({title,table,rows,onAdd,onToggle}:{title:string;table:Taxonomy;rows:any[];onAdd:(table:Taxonomy,name:string)=>Promise<void>;onToggle:(table:Taxonomy,row:any)=>Promise<void>}){
  const [name,setName]=useState('')
  return <section className="admin-section"><div className="section-head"><h2>{title}</h2><form onSubmit={e=>{e.preventDefault();void onAdd(table,name).then(()=>setName(''))}}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nuevo"/><button>+ AGREGAR</button></form></div><div className="taxonomy-list">{rows.map(row=><div key={row.id}><span><b>{row.name}</b><small>{row.slug}</small></span><button onClick={()=>void onToggle(table,row)}>{row.enabled?'DESACTIVAR':'ACTIVAR'}</button></div>)}</div></section>
}
