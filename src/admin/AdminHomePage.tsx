import { useEffect, useState } from 'react'
import { fetchCatalog, saveHomepage } from '../lib/catalogRepository'
import type { CatalogSnapshot, HomepageSettings } from '../types'

export function AdminHomePage(){
  const [catalog,setCatalog]=useState<CatalogSnapshot|null>(null);const [home,setHome]=useState<HomepageSettings|null>(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState<string|null>(null)
  useEffect(()=>{fetchCatalog(true).then(c=>{setCatalog(c);setHome(c.homepage)}).catch(e=>setMessage(e.message))},[])
  if(!catalog||!home)return <div className="admin-page">Cargando…</div>
  const active=catalog.products.filter(p=>p.status!=='archived')
  const select=(label:string,value:string|null,onChange:(id:string|null)=>void)=><label>{label}<select value={value||''} onChange={e=>onChange(e.target.value||null)}><option value="">Sin selección</option>{active.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  async function save(){setBusy(true);setMessage(null);try{await saveHomepage(home);setMessage('Home guardada.')}catch(e){setMessage(e instanceof Error?e.message:'Error guardando Home')}finally{setBusy(false)}}
  return <div className="admin-page"><header className="admin-page-head"><div><span>CMS / HOME</span><h1>MERCHANDISING.</h1></div><button className="btn dark" disabled={busy} onClick={save}>{busy?'GUARDANDO…':'GUARDAR'}</button></header>{message&&<div className="admin-notice">{message}</div>}
    <div className="admin-form-grid"><label className="wide">Headline<textarea rows={2} value={home.heroHeadline} onChange={e=>setHome({...home,heroHeadline:e.target.value})}/></label><label className="wide">Subheadline<textarea rows={2} value={home.heroSubheadline} onChange={e=>setHome({...home,heroSubheadline:e.target.value})}/></label>{select('Hero Product',home.heroProductId,id=>setHome({...home,heroProductId:id}))}{select('Secondary Hero',home.heroSecondaryProductId,id=>setHome({...home,heroSecondaryProductId:id}))}{select('Fragrance primary',home.fragrancePrimaryId,id=>setHome({...home,fragrancePrimaryId:id}))}{select('Fragrance secondary',home.fragranceSecondaryId,id=>setHome({...home,fragranceSecondaryId:id}))}{select('Editorial product',home.editorialProductId,id=>setHome({...home,editorialProductId:id}))}<label>Editorial image URL<input value={home.editorialImageUrl||''} onChange={e=>setHome({...home,editorialImageUrl:e.target.value||null})}/></label></div>
    <section className="admin-section"><h2>PRODUCTOS DESTACADOS</h2><div className="admin-checks">{active.map(p=><label key={p.id}><input type="checkbox" checked={home.featuredProductIds.includes(p.id)} onChange={e=>setHome({...home,featuredProductIds:e.target.checked?[...home.featuredProductIds,p.id]:home.featuredProductIds.filter(x=>x!==p.id)})}/>{p.name}</label>)}</div><small>La interfaz utiliza como máximo los primeros cuatro seleccionados.</small></section>
  </div>
}
