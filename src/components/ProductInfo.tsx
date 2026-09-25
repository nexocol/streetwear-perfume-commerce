import { useMemo } from 'react'
import type { Product } from '../types'
import { availableColors, colorLabel, isBuyable, useVariantSelection } from '../lib/variants'
import { money } from '../lib/format'
import { useCommerce } from '../commerce/CommerceProvider'
import { useUI } from '../context/UIContext'
import { ShippingPayments } from './ShippingPayments'
import { displayCategory, displayProductDescription, displayProductFeatures, displayProductName, displayProductSubtitle, productStyle } from '../lib/clientContent'

export function ProductInfo({product}:{product:Product}){
  const commerce=useCommerce();const ui=useUI();const single=product.variants.length===1
  const selection=useVariantSelection(product.variants);const {variant}=selection
  const colorsAvailable=useMemo(()=>availableColors(product.variants),[product.variants])
  const unavailable=!variant||!variant.available||variant.stock===0
  const displayPrice=variant?.price??product.price
  const name=displayProductName(product);const subtitle=displayProductSubtitle(product);const description=displayProductDescription(product);const style=productStyle(product);const features=displayProductFeatures(product)
  const perfume=product.category==='Perfumes'
  async function add(){if(!variant||unavailable)return;await commerce.addLine(product,variant);ui.showToast(name+' agregado');ui.openCart()}
  return <aside className="pdp-info">
    <span>{perfume?displayCategory(product.category).toLocaleUpperCase('es')+' / '+(product.subtitle?.trim()||'PERFIL OLFATIVO').toLocaleUpperCase('es'):<>{displayCategory(product.category)} / {style||'ESTILO POR CONFIRMAR'}</>}</span><h1>{name}</h1><p className="subtitle">{subtitle}</p><div className="price">{money(displayPrice,'detail')}</div><p>{description}</p>
    {colorsAvailable.length>1&&<p className="pdp-colors"><span>COLORES DISPONIBLES</span> {colorsAvailable.map(colorLabel).join(' · ')}</p>}
    <div className="product-facts">{perfume?<div><span>FAMILIA OLFATIVA</span><b>{product.fragranceFamily||'Por confirmar'}</b></div>:<div><span>{product.category==='Jeans'?'ESTILO / SUBTIPO':'ESTILO / FIT'}</span><b>{style||'Por confirmar'}</b></div>}<div><span>DISPONIBILIDAD</span><b>{variant?.stock===0?'AGOTADO':variant?'DISPONIBLE':'SELECCIONA TALLA'}</b></div></div>
    {selection.hasColors&&<>
      <div className="size-heading"><span>COLOR</span><b className="color-current" data-testid="selected-color">{colorLabel(selection.color||'')}</b></div>
      <div className="color-options" role="group" aria-label="Color">{selection.colors.map(c=>{const buyable=product.variants.some(v=>(v.color||'').trim()===c&&isBuyable(v));return <button key={c||'_'} className={selection.color===c?'selected':''} aria-pressed={selection.color===c} disabled={!buyable} onClick={()=>selection.selectColor(c)}>{colorLabel(c)}</button>})}</div>
    </>}
    <div className="size-heading"><span>{single?'OPCIÓN':'SELECCIONA TU TALLA'}</span>{product.category==='Jeans'&&<button className="text-link" onClick={()=>ui.openInfo('size')}>GUÍA DE TALLAS ↗</button>}</div>
    <div className="sizes" role="group" aria-label="Talla">{selection.sizeOptions.map(v=><button key={v.id} className={selection.size===v.size?'selected':''} aria-pressed={selection.size===v.size} disabled={!isBuyable(v)} onClick={()=>selection.selectSize(v.size)}>{v.size}</button>)}</div>
    <button className="btn dark wide add-button" onClick={add} disabled={unavailable} data-cursor="AGREGAR">{variant?unavailable?'NO DISPONIBLE':'AGREGAR AL CARRITO':'SELECCIONA TU TALLA'}</button>

    {perfume?<details open><summary>COMPOSICIÓN / NOTAS <span>+</span></summary><div className="perfume-profile">
      <div><span>NOTAS PRINCIPALES</span>{features.length?<ul>{features.map((f,i)=><li key={i}>{f}</li>)}</ul>:<b>Por confirmar</b>}</div>
      <div><span>FAMILIA OLFATIVA</span><b>{product.fragranceFamily||'Por confirmar'}</b></div>
      <div><span>DESCRIPCIÓN</span><p>{description}</p></div>
    </div></details>:<details open><summary>DETALLES DEL PRODUCTO <span>+</span></summary><ul>{features.length?features.map((f,i)=><li key={i}>{f}</li>):<li>{style?'Estilo: '+style+'.':'Información adicional por confirmar.'}</li>}</ul></details>}

    <details><summary>ENVÍOS Y MÉTODOS DE PAGO <span>+</span></summary><ShippingPayments compact/></details>
    <details><summary>CAMBIOS <span>+</span></summary><p>Consulta las condiciones de cambio antes de finalizar tu compra.</p></details>
  </aside>
}
