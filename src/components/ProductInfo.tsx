import { useMemo } from 'react'
import type { Product } from '../types'
import { availableColors, colorLabel } from '../lib/variants'
import type { VariantSelection } from '../lib/variants'
import { moneyFrom } from '../lib/format'
import { canBuy, selectedVariantPrice, productPrice } from '../lib/pricing'
import { useCommerce } from '../commerce/CommerceProvider'
import { useCatalog } from '../context/CatalogContext'
import { useUI } from '../context/UIContext'
import { ShippingPayments } from './ShippingPayments'
import { ArrowIcon } from './ArrowIcon'
import { categorySingularLabel, displayCategory, displayProductDescription, displayProductFeatures, displayProductName, displayProductSubtitle, productStyle } from '../lib/clientContent'
import { productIsAvailable } from '../lib/availability'
import { isWatchFamily } from '../lib/watchCatalog'

export function ProductInfo({product,selection,onSelectColor,onSelectSize}:{product:Product;selection:VariantSelection;onSelectColor:(color:string)=>void;onSelectSize:(size:string)=>void}){
  const commerce=useCommerce();const ui=useUI();const {catalog}=useCatalog();const single=product.variants.length===1||product.variants.every(v=>v.size==='Única')
  const shopifyEnabled=Boolean(catalog?.site?.shopifyEnabled)
  const {variant}=selection
  const colorsAvailable=useMemo(()=>availableColors(product.variants,shopifyEnabled),[product.variants,shopifyEnabled])
  const unavailable=!variant||!canBuy(variant,shopifyEnabled)
  const productAvailable=productIsAvailable(product,shopifyEnabled)
  const catalogPrice=productPrice(product,shopifyEnabled)
  const displayPrice=variant?selectedVariantPrice(variant,product,shopifyEnabled):catalogPrice.amount
  const name=displayProductName(product)+(isWatchFamily(product)&&variant?.color?' · '+variant.color:'');const subtitle=displayProductSubtitle(product);const description=displayProductDescription(product);const style=productStyle(product);const features=displayProductFeatures(product)
  const perfume=product.category==='Perfumes'
  const typeLabel=categorySingularLabel(product.category)
  const titleFit=Math.max(7.5,...name.split(/\s+/).map(word=>word.length*1.02))
  async function add(){if(!variant||unavailable)return;await commerce.addLine(product,variant);ui.showToast(name+' agregado');ui.openCart()}
  return <aside className="pdp-info">
    <span>{perfume?displayCategory(product.category).toLocaleUpperCase('es')+' / '+(product.subtitle?.trim()||'PERFIL OLFATIVO').toLocaleUpperCase('es'):style?<>{displayCategory(product.category)} / {style}</>:displayCategory(product.category).toLocaleUpperCase('es')}</span><h1 style={{'--product-title-fit':titleFit} as React.CSSProperties}>{name}</h1><p className="subtitle">{subtitle}</p><div className="price">{moneyFrom(displayPrice,!variant&&catalogPrice.isRange,'detail')}</div><p>{description}</p>
    {colorsAvailable.length>1&&<p className="pdp-colors"><span>COLORES DISPONIBLES</span> {colorsAvailable.map(colorLabel).join(' · ')}</p>}
    <div className="product-facts">{perfume?<div><span>FAMILIA OLFATIVA</span><b>{product.fragranceFamily||'Por confirmar'}</b></div>:style?<div><span>{product.category==='Jeans'?'ESTILO / SUBTIPO':'ESTILO / FIT'}</span><b>{style}</b></div>:typeLabel&&<div><span>PRODUCTO</span><b>{typeLabel}</b></div>}<div><span>DISPONIBILIDAD</span><b>{!productAvailable||(variant&&unavailable)?'NO DISPONIBLE':variant?'DISPONIBLE':'SELECCIONA TALLA'}</b></div></div>
    {selection.hasColors&&<>
      <div className="size-heading"><span>COLOR</span><b className="color-current" data-testid="selected-color">{colorLabel(selection.color||'')}</b></div>
      <div className="color-options" role="group" aria-label="Color">{selection.colors.map(c=>{const buyable=product.variants.some(v=>(v.color||'').trim()===c&&canBuy(v,shopifyEnabled));return <button key={c||'_'} className={selection.color===c?'selected':''} aria-pressed={selection.color===c} disabled={!buyable&&selection.color!==c} onClick={()=>onSelectColor(c)}>{colorLabel(c)}</button>})}</div>
    </>}
    <div className="size-heading"><span>{single?'OPCIÓN':'SELECCIONA TU TALLA'}</span>{['Jeans','Streetwear','Buzos','Sudaderas','Pantalonetas','Shorts'].includes(product.category)&&<button className="text-link" onClick={()=>ui.openInfo('size')}>GUÍA DE TALLAS <ArrowIcon/></button>}</div>
    <div className="sizes" role="group" aria-label="Talla">{selection.sizeOptions.map(v=><button key={v.id} className={selection.size===v.size?'selected':''} aria-pressed={selection.size===v.size} disabled={!canBuy(v,shopifyEnabled)&&selection.size!==v.size} onClick={()=>onSelectSize(v.size)}>{v.size}</button>)}</div>
    <button className="btn dark wide add-button" onClick={add} disabled={unavailable} data-cursor="AGREGAR">{variant?unavailable?'NO DISPONIBLE':'AGREGAR AL CARRITO':'SELECCIONA TU TALLA'}</button>

    {perfume?<details open><summary>COMPOSICIÓN / NOTAS <span>+</span></summary><div className="perfume-profile">
      <div><span>NOTAS PRINCIPALES</span>{features.length?<ul>{features.map((f,i)=><li key={i}>{f}</li>)}</ul>:<b>Por confirmar</b>}</div>
      <div><span>FAMILIA OLFATIVA</span><b>{product.fragranceFamily||'Por confirmar'}</b></div>
      <div><span>DESCRIPCIÓN</span><p>{description}</p></div>
    </div></details>:(features.length>0||style)&&<details open><summary>DETALLES DEL PRODUCTO <span>+</span></summary><ul>{features.length?features.map((f,i)=><li key={i}>{f}</li>):<li>Estilo: {style}.</li>}</ul></details>}

    <details><summary>ENVÍOS Y MÉTODOS DE PAGO <span>+</span></summary><ShippingPayments compact/></details>
    <details><summary>CAMBIOS <span>+</span></summary><p>Consulta las condiciones de cambio antes de finalizar tu compra.</p></details>
  </aside>
}
