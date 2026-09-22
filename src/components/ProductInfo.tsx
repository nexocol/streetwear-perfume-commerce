import { useMemo, useState } from 'react'
import type { Product } from '../types'
import { money } from '../lib/format'
import { useCommerce } from '../commerce/CommerceProvider'
import { useUI } from '../context/UIContext'

export function ProductInfo({product}:{product:Product}){
  const commerce=useCommerce();const ui=useUI();const single=product.variants.length===1
  const [variantId,setVariantId]=useState<string|null>(single?product.variants[0]?.id:null)
  const variant=useMemo(()=>product.variants.find(v=>v.id===variantId)||null,[product.variants,variantId])
  const unavailable=!variant||!variant.available||variant.stock===0
  const displayPrice=variant?.price??product.price
  async function add(){if(!variant||unavailable)return;await commerce.addLine(product,variant);ui.showToast(product.name+' agregado');ui.openCart()}
  return <aside className="pdp-info">
    <span>{product.category} / {product.fit||'EDITION'}</span><h1>{product.name}</h1><p className="subtitle">{product.subtitle}</p><div className="price">{money(displayPrice,'detail')}</div><p>{product.description}</p>
    <div className="product-facts"><div><span>FIT</span><b>{product.fit||'—'}</b></div><div><span>DISPONIBILIDAD</span><b>{variant?.stock===0?'AGOTADO':variant?'DISPONIBLE':'SELECCIONA TALLA'}</b></div></div>
    <div className="size-heading"><span>{single?'OPCIÓN':'SELECCIONA TU TALLA'}</span>{product.category==='Jeans'&&<button className="text-link" onClick={()=>ui.openInfo('size')}>GUÍA DE TALLAS ↗</button>}</div>
    <div className="sizes">{product.variants.map(v=><button key={v.id} className={variantId===v.id?'selected':''} aria-pressed={variantId===v.id} disabled={!v.available||v.stock===0} onClick={()=>setVariantId(v.id)}>{v.size}</button>)}</div>
    <button className="btn dark wide add-button" onClick={add} disabled={unavailable} data-cursor="AGREGAR">{variant?unavailable?'NO DISPONIBLE':'AGREGAR AL CARRITO':'SELECCIONA TU TALLA'}</button>
    <details open><summary>DETALLES DEL PRODUCTO <span>+</span></summary><ul>{product.features.length?product.features.map((f,i)=><li key={i}>{f}</li>):<li>Información adicional disponible próximamente.</li>}</ul></details>
    <details><summary>CAMBIOS <span>+</span></summary><p>Consulta las condiciones de cambio antes de finalizar tu compra.</p></details>
  </aside>
}
