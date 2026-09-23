import { useMemo, useState } from 'react'
import type { Product } from '../types'
import { money } from '../lib/format'
import { useCommerce } from '../commerce/CommerceProvider'
import { useUI } from '../context/UIContext'
import { ShippingPayments } from './ShippingPayments'
import { displayCategory, displayProductDescription, displayProductName, displayProductSubtitle, productStyle } from '../lib/clientContent'

export function ProductInfo({product}:{product:Product}){
  const commerce=useCommerce();const ui=useUI();const single=product.variants.length===1
  const [variantId,setVariantId]=useState<string|null>(single?product.variants[0]?.id:null)
  const variant=useMemo(()=>product.variants.find(v=>v.id===variantId)||null,[product.variants,variantId])
  const unavailable=!variant||!variant.available||variant.stock===0
  const displayPrice=variant?.price??product.price
  const name=displayProductName(product);const subtitle=displayProductSubtitle(product);const description=displayProductDescription(product);const style=productStyle(product)
  const perfume=product.category==='Perfumes'
  async function add(){if(!variant||unavailable)return;await commerce.addLine(product,variant);ui.showToast(name+' agregado');ui.openCart()}
  return <aside className="pdp-info">
    <span>{displayCategory(product.category)} / {style||'ESTILO POR CONFIRMAR'}</span><h1>{name}</h1><p className="subtitle">{subtitle}</p><div className="price">{money(displayPrice,'detail')}</div><p>{description}</p>
    <div className="product-facts"><div><span>{product.category==='Jeans'?'ESTILO / SUBTIPO':'ESTILO / FIT'}</span><b>{style||'Por confirmar'}</b></div><div><span>DISPONIBILIDAD</span><b>{variant?.stock===0?'AGOTADO':variant?'DISPONIBLE':'SELECCIONA TALLA'}</b></div></div>
    <div className="size-heading"><span>{single?'OPCIÓN':'SELECCIONA TU TALLA'}</span>{product.category==='Jeans'&&<button className="text-link" onClick={()=>ui.openInfo('size')}>GUÍA DE TALLAS ↗</button>}</div>
    <div className="sizes">{product.variants.map(v=><button key={v.id} className={variantId===v.id?'selected':''} aria-pressed={variantId===v.id} disabled={!v.available||v.stock===0} onClick={()=>setVariantId(v.id)}>{v.size}</button>)}</div>
    <button className="btn dark wide add-button" onClick={add} disabled={unavailable} data-cursor="AGREGAR">{variant?unavailable?'NO DISPONIBLE':'AGREGAR AL CARRITO':'SELECCIONA TU TALLA'}</button>

    {perfume?<details open><summary>COMPOSICIÓN / NOTAS <span>+</span></summary><div className="perfume-profile">
      <div><span>NOTAS PRINCIPALES</span>{product.features.length?<ul>{product.features.map((f,i)=><li key={i}>{f}</li>)}</ul>:<b>Por confirmar</b>}</div>
      <div><span>FAMILIA OLFATIVA</span><b>Por confirmar</b></div>
      <div><span>DESCRIPCIÓN</span><p>{description}</p></div>
    </div></details>:<details open><summary>DETALLES DEL PRODUCTO <span>+</span></summary><ul>{product.features.length?product.features.map((f,i)=><li key={i}>{f}</li>):<li>{style?'Estilo: '+style+'.':'Información adicional por confirmar.'}</li>}</ul></details>}

    <details><summary>ENVÍOS Y MÉTODOS DE PAGO <span>+</span></summary><ShippingPayments compact/></details>
    <details><summary>CAMBIOS <span>+</span></summary><p>Consulta las condiciones de cambio antes de finalizar tu compra.</p></details>
  </aside>
}
