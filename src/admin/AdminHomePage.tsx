import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchCatalog, saveHomepage, uploadHomepageEditorialImage } from '../lib/catalogRepository'
import type { CatalogSnapshot, HomepageSettings, Product } from '../types'
import { ImageWithFallback } from '../components/ImageWithFallback'
import { clientHomeHeadline, clientHomeSubheadline, displayCategory, displayProductName, productStyle } from '../lib/clientContent'

type SaveState='idle'|'dirty'|'saving'|'saved'|'error'

function ProductPicker({label,value,products,onChange}:{label:string;value:string|null;products:Product[];onChange:(id:string|null)=>void}){
  const selected=products.find(p=>p.id===value)
  return <label className="product-picker"><span>{label}</span><div className="product-picker-card">{selected?<><ImageWithFallback src={selected.media[0]?.publicUrl} alt={displayProductName(selected)}/><div><b>{displayProductName(selected)}</b><small>{displayCategory(selected.category)}{productStyle(selected)?' / '+productStyle(selected):''}</small></div></>:<div className="product-picker-empty">SIN SELECCIÓN</div>}<select value={value||''} onChange={e=>onChange(e.target.value||null)}><option value="">Sin selección</option>{products.map(p=><option key={p.id} value={p.id}>{displayProductName(p)}</option>)}</select></div></label>
}

export function AdminHomePage(){
  const [catalog,setCatalog]=useState<CatalogSnapshot|null>(null)
  const [home,setHome]=useState<HomepageSettings|null>(null)
  const [baseline,setBaseline]=useState('')
  const [saveState,setSaveState]=useState<SaveState>('idle')
  const [message,setMessage]=useState<string|null>(null)
  const [uploading,setUploading]=useState(false)
  const fileRef=useRef<HTMLInputElement>(null)

  useEffect(()=>{fetchCatalog(true).then(c=>{const next={...c.homepage,heroHeadline:clientHomeHeadline(c.homepage.heroHeadline),heroSubheadline:clientHomeSubheadline(c.homepage.heroSubheadline)};setCatalog(c);setHome(next);setBaseline(JSON.stringify(next))}).catch(e=>{setMessage(e.message);setSaveState('error')})},[])
  const active=useMemo(()=>catalog?.products.filter(p=>p.status!=='archived')||[],[catalog])
  const selectedFeatured=useMemo(()=>home?home.featuredProductIds.map(id=>active.find(p=>p.id===id)).filter(Boolean).slice(0,4) as Product[]:[],[home,active])
  const dirty=home?JSON.stringify(home)!==baseline:false

  useEffect(()=>{if(dirty&&saveState!=='saving')setSaveState('dirty')},[dirty])

  function patch(next:Partial<HomepageSettings>){setHome(h=>h?{...h,...next}:h)}
  function moveFeatured(index:number,dir:number){
    if(!home)return;const ids=home.featuredProductIds.slice(0,4);const target=index+dir;if(target<0||target>=ids.length)return
    ;[ids[index],ids[target]]=[ids[target],ids[index]];patch({featuredProductIds:ids})
  }
  function removeFeatured(id:string){if(home)patch({featuredProductIds:home.featuredProductIds.filter(x=>x!==id)})}
  function addFeatured(id:string){if(!home||!id||home.featuredProductIds.includes(id))return;patch({featuredProductIds:[...home.featuredProductIds,id].slice(0,4)})}

  async function save(){
    if(!home)return;setSaveState('saving');setMessage(null)
    try{await saveHomepage(home);setBaseline(JSON.stringify(home));setSaveState('saved');setMessage('Cambios guardados correctamente.');window.setTimeout(()=>setSaveState('idle'),1800)}
    catch(e){setMessage(e instanceof Error?e.message:'Error guardando Home');setSaveState('error')}
  }
  async function uploadEditorial(file:File){
    setUploading(true);setMessage(null)
    try{const result=await uploadHomepageEditorialImage(file);patch({editorialImageUrl:result.url});setSaveState('dirty')}
    catch(e){setMessage(e instanceof Error?e.message:'Error subiendo imagen');setSaveState('error')}
    finally{setUploading(false)}
  }

  if(!catalog||!home)return <div className="admin-page">Cargando…</div>
  const availableForFeatured=active.filter(p=>!home.featuredProductIds.includes(p.id))

  return <div className="admin-page admin-home-page">
    <header className="admin-page-head"><div><span>CMS / HOME</span><h1>HOME.</h1><p>Define qué productos y piezas visuales aparecen en la portada.</p></div><button className="btn dark" disabled={!dirty||saveState==='saving'} onClick={save}>{saveState==='saving'?'GUARDANDO…':saveState==='saved'?'GUARDADO ✓':'GUARDAR'}</button></header>
    {message&&<div className={saveState==='error'?'admin-warning':'admin-notice'}>{message}</div>}

    <section className="admin-section admin-home-copy"><div className="section-head"><div><span>01</span><h2>COPY PRINCIPAL</h2></div></div><div className="admin-form-grid"><label className="wide">Titular<textarea rows={2} value={home.heroHeadline} onChange={e=>patch({heroHeadline:e.target.value})}/></label><label className="wide">Texto de apoyo<textarea rows={2} value={home.heroSubheadline} onChange={e=>patch({heroSubheadline:e.target.value})}/></label></div></section>

    <section className="admin-section"><div className="section-head"><div><span>02</span><h2>HERO</h2></div></div><div className="product-picker-grid"><ProductPicker label="Producto principal" value={home.heroProductId} products={active} onChange={id=>patch({heroProductId:id})}/><ProductPicker label="Producto secundario" value={home.heroSecondaryProductId} products={active} onChange={id=>patch({heroSecondaryProductId:id})}/></div></section>

    <section className="admin-section"><div className="section-head"><div><span>03</span><h2>FRAGANCIAS + EDITORIAL</h2></div></div><div className="product-picker-grid"><ProductPicker label="Fragancia principal" value={home.fragrancePrimaryId} products={active} onChange={id=>patch({fragrancePrimaryId:id})}/><ProductPicker label="Fragancia secundaria" value={home.fragranceSecondaryId} products={active} onChange={id=>patch({fragranceSecondaryId:id})}/><ProductPicker label="Producto editorial" value={home.editorialProductId} products={active} onChange={id=>patch({editorialProductId:id})}/></div>
      <div className="editorial-media-picker"><div className="editorial-media-preview">{home.editorialImageUrl?<ImageWithFallback src={home.editorialImageUrl} alt="Imagen editorial actual"/>:<div className="image-fallback"><span>SIN IMAGEN EDITORIAL</span></div>}</div><div><span>IMAGEN EDITORIAL</span><h3>Lookbook / Home</h3><p>Sube la fotografía que acompañará la sección Editorial. Se almacena en R2.</p><input ref={fileRef} type="file" hidden accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadEditorial(file)}}/><button className="btn dark" disabled={uploading} onClick={()=>fileRef.current?.click()}>{uploading?'SUBIENDO…':home.editorialImageUrl?'REEMPLAZAR IMAGEN':'SUBIR IMAGEN'}</button></div></div>
    </section>

    <section className="admin-section"><div className="section-head"><div><span>04</span><h2>PRODUCTOS DESTACADOS</h2></div><small>Máximo 4 · el orden se refleja en Home</small></div>
      <div className="featured-order">{selectedFeatured.map((p,i)=><article key={p.id}><span className="featured-number">{i+1}</span><ImageWithFallback src={p.media[0]?.publicUrl} alt={p.name}/><div><b>{displayProductName(p)}</b><small>{displayCategory(p.category)} / {productStyle(p)||'—'}</small></div><div className="order-actions"><button disabled={i===0} onClick={()=>moveFeatured(i,-1)} aria-label={'Subir '+p.name}>↑</button><button disabled={i===selectedFeatured.length-1} onClick={()=>moveFeatured(i,1)} aria-label={'Bajar '+p.name}>↓</button><button onClick={()=>removeFeatured(p.id)}>QUITAR</button></div></article>)}</div>
      {selectedFeatured.length<4&&<label className="add-featured">Agregar producto<select defaultValue="" onChange={e=>{addFeatured(e.target.value);e.currentTarget.value=''}}><option value="">Seleccionar…</option>{availableForFeatured.map(p=><option value={p.id} key={p.id}>{displayProductName(p)}</option>)}</select></label>}
    </section>

    <div className={'admin-savebar '+(dirty?'visible':'')}><span>{saveState==='saving'?'Guardando cambios…':saveState==='saved'?'Guardado ✓':'Cambios sin guardar'}</span><button className="btn dark" disabled={!dirty||saveState==='saving'} onClick={save}>{saveState==='saving'?'GUARDANDO…':'GUARDAR CAMBIOS'}</button></div>
  </div>
}
