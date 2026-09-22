import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createBlankProduct, deleteProductMedia, fetchCatalog, reorderProductMedia, saveProduct, uploadProductMedia } from '../lib/catalogRepository'
import type { CatalogSnapshot, MediaType, Product, ProductMedia, Variant } from '../types'
import { ImageWithFallback } from '../components/ImageWithFallback'

const mediaTypes:MediaType[]=['hero','front','back','detail','model','editorial','thumbnail']
type SaveState='idle'|'dirty'|'saving'|'saved'|'error'

export function AdminProductEditPage(){
  const {id}=useParams();const navigate=useNavigate()
  const [catalog,setCatalog]=useState<CatalogSnapshot|null>(null);const [product,setProduct]=useState<Product|null>(null);const [collections,setCollections]=useState<string[]>([])
  const [baseline,setBaseline]=useState('');const [saveState,setSaveState]=useState<SaveState>('idle');const [error,setError]=useState<string|null>(null)
  const [mediaType,setMediaType]=useState<MediaType>('hero');const [mediaAlt,setMediaAlt]=useState('');const [mediaBusy,setMediaBusy]=useState(false)

  async function load(){
    try{
      const c=await fetchCatalog(true);setCatalog(c)
      if(id==='new'||!id){const p=await createBlankProduct();setProduct(p);setCollections([]);setBaseline(JSON.stringify({product:p,collections:[]}))}
      else{const p=c.products.find(x=>x.id===id);if(!p)throw new Error('Producto no encontrado');const cols=p.collections.map(x=>x.id);setProduct(p);setCollections(cols);setBaseline(JSON.stringify({product:p,collections:cols}))}
      setError(null)
    }catch(e){setError(e instanceof Error?e.message:'Error cargando producto')}
  }
  useEffect(()=>{void load()},[id])
  const isNew=id==='new'
  const categoryName=useMemo(()=>catalog?.categories.find(c=>c.id===product?.categoryId)?.name||'',[catalog,product?.categoryId])
  const dirty=product?JSON.stringify({product,collections})!==baseline:false
  useEffect(()=>{if(dirty&&saveState!=='saving')setSaveState('dirty')},[dirty])

  function patch<K extends keyof Product>(key:K,value:Product[K]){setProduct(p=>p?{...p,[key]:value}:p)}
  function patchVariant(index:number,key:keyof Variant,value:any){setProduct(p=>p?{...p,variants:p.variants.map((v,i)=>i===index?{...v,[key]:value}:v)}:p)}
  function addVariant(){setProduct(p=>p?{...p,variants:[...p.variants,{id:'temp-'+crypto.randomUUID(),productId:p.id,size:'',color:null,sku:null,price:null,stock:null,available:true,shopifyVariantId:null,sortOrder:p.variants.length+1}]}:p)}
  function removeVariant(index:number){setProduct(p=>p?{...p,variants:p.variants.filter((_,i)=>i!==index)}:p)}

  async function save(){
    if(!product)return;setSaveState('saving');setError(null)
    try{
      const next={...product,category:categoryName};const saved=await saveProduct(next,collections);const cols=saved.collections.map(c=>c.id)
      setProduct(saved);setCollections(cols);setBaseline(JSON.stringify({product:saved,collections:cols}));setSaveState('saved')
      if(isNew)navigate('/admin/products/'+saved.id,{replace:true})
      window.setTimeout(()=>setSaveState('idle'),1800)
    }catch(e){setError(e instanceof Error?e.message:'Error guardando producto');setSaveState('error')}
  }
  async function upload(file:File){if(!product||isNew){setError('Guarda el producto antes de subir imágenes.');return}setMediaBusy(true);try{await uploadProductMedia(product.id,file,mediaType,mediaAlt);await load()}catch(e){setError(e instanceof Error?e.message:'Error subiendo imagen')}finally{setMediaBusy(false)}}
  async function removeMedia(m:ProductMedia){setMediaBusy(true);try{await deleteProductMedia(m);await load()}catch(e){setError(e instanceof Error?e.message:'Error eliminando imagen')}finally{setMediaBusy(false)}}
  async function moveMedia(index:number,dir:number){if(!product)return;const next=[...product.media];const target=index+dir;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];setMediaBusy(true);try{await reorderProductMedia(next);await load()}catch(e){setError(e instanceof Error?e.message:'Error reordenando media')}finally{setMediaBusy(false)}}

  if(!product||!catalog)return <div className="admin-page">Cargando…</div>
  return <div className="admin-page admin-editor">
    <header className="admin-page-head"><div><span>PRODUCTO / {isNew?'NUEVO':product.name}</span><h1>{isNew?'CREAR.':'EDITAR.'}</h1><p>Información comercial, variantes y media del producto.</p></div><button className="btn dark" disabled={!dirty||saveState==='saving'} onClick={save}>{saveState==='saving'?'GUARDANDO…':saveState==='saved'?'GUARDADO ✓':'GUARDAR'}</button></header>
    {error&&<div className="admin-warning">{error}</div>}
    <section className="admin-form-grid"><label>Nombre<input value={product.name} onChange={e=>patch('name',e.target.value)}/></label><label>Slug<input value={product.slug} onChange={e=>patch('slug',e.target.value)}/></label><label>Subtítulo<input value={product.subtitle||''} onChange={e=>patch('subtitle',e.target.value)}/></label><label>Categoría<select value={product.categoryId||''} onChange={e=>patch('categoryId',e.target.value||null)}><option value="">Sin categoría</option>{catalog.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Fit<select value={product.fit||''} onChange={e=>patch('fit',e.target.value||null)}><option value="">Sin fit</option>{catalog.fits.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}</select></label><label>Color<input value={product.color||''} onChange={e=>patch('color',e.target.value||null)}/></label><label>Precio<input type="number" value={product.price??''} onChange={e=>patch('price',e.target.value?Number(e.target.value):null)}/></label><label>Precio anterior<input type="number" value={product.compareAtPrice??''} onChange={e=>patch('compareAtPrice',e.target.value?Number(e.target.value):null)}/></label><label>Estado<select value={product.status} onChange={e=>patch('status',e.target.value as Product['status'])}><option value="draft">Borrador</option><option value="active">Activo</option><option value="hidden">Oculto</option><option value="archived">Archivado</option></select></label><label>Orden<input type="number" value={product.sortOrder} onChange={e=>patch('sortOrder',Number(e.target.value))}/></label><label className="wide">Descripción<textarea rows={4} value={product.description||''} onChange={e=>patch('description',e.target.value)}/></label></section>

    <section className="admin-flags"><label><input type="checkbox" checked={product.featured} onChange={e=>patch('featured',e.target.checked)}/> Destacado</label><label><input type="checkbox" checked={product.newArrival} onChange={e=>patch('newArrival',e.target.checked)}/> Nuevo</label><label><input type="checkbox" checked={product.bestSeller} onChange={e=>patch('bestSeller',e.target.checked)}/> Best seller</label></section>

    <section className="admin-section"><h2>COLECCIONES</h2><div className="admin-checks">{catalog.collections.map(c=><label key={c.id}><input type="checkbox" checked={collections.includes(c.id)} onChange={e=>setCollections(list=>e.target.checked?[...list,c.id]:list.filter(x=>x!==c.id))}/>{c.name}</label>)}</div></section>

    <section className="admin-section"><div className="section-head"><h2>VARIANTES</h2><button onClick={addVariant}>+ TALLA</button></div><div className="variant-editor">{product.variants.map((v,i)=><div key={v.id}><input placeholder="Talla" value={v.size} onChange={e=>patchVariant(i,'size',e.target.value)}/><input placeholder="SKU" value={v.sku||''} onChange={e=>patchVariant(i,'sku',e.target.value||null)}/><input type="number" placeholder="Precio" value={v.price??''} onChange={e=>patchVariant(i,'price',e.target.value?Number(e.target.value):null)}/><input type="number" placeholder="Stock" value={v.stock??''} onChange={e=>patchVariant(i,'stock',e.target.value?Number(e.target.value):null)}/><label><input type="checkbox" checked={v.available} onChange={e=>patchVariant(i,'available',e.target.checked)}/> Disponible</label><button onClick={()=>removeVariant(i)}>ELIMINAR</button></div>)}</div></section>

    <section className="admin-section"><div className="section-head"><h2>MEDIA</h2><small>R2 · orden de aparición</small></div>{isNew?<p>Guarda primero el producto para habilitar media.</p>:<><div className="media-upload"><select value={mediaType} onChange={e=>setMediaType(e.target.value as MediaType)}>{mediaTypes.map(t=><option key={t}>{t}</option>)}</select><input placeholder="Texto alternativo" value={mediaAlt} onChange={e=>setMediaAlt(e.target.value)}/><label className="file-button">{mediaBusy?'SUBIENDO…':'SUBIR IMAGEN'}<input type="file" hidden accept="image/*" disabled={mediaBusy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f)}}/></label></div><div className="media-editor">{product.media.map((m,i)=><article key={m.id}><ImageWithFallback src={m.publicUrl} alt={m.alt||product.name}/><div><b>{m.mediaType}</b><small>{m.alt}</small></div><button disabled={i===0||mediaBusy} onClick={()=>moveMedia(i,-1)}>↑</button><button disabled={i===product.media.length-1||mediaBusy} onClick={()=>moveMedia(i,1)}>↓</button><button disabled={mediaBusy} onClick={()=>removeMedia(m)}>ELIMINAR</button></article>)}</div></>}</section>

    <div className={'admin-savebar '+(dirty?'visible':'')}><span>{saveState==='saving'?'Guardando cambios…':saveState==='saved'?'Guardado ✓':'Cambios sin guardar'}</span><button className="btn dark" disabled={!dirty||saveState==='saving'} onClick={save}>GUARDAR CAMBIOS</button></div>
  </div>
}
