import { useState } from 'react'
import { Link } from 'react-router-dom'
import { colorLabel, useVariantSelection } from '../lib/variants'
import type { Product } from '../types'
import { moneyFrom, pad } from '../lib/format'
import { canBuy, productPrice } from '../lib/pricing'
import { displayProductName, displayProductSubtitle } from '../lib/clientContent'
import { useCommerce } from '../commerce/CommerceProvider'
import { useCatalog } from '../context/CatalogContext'
import { useUI } from '../context/UIContext'
import { ImageWithFallback } from './ImageWithFallback'

export function ProductCard({product,index=0,className='',eager=false}:{product:Product;index?:number;className?:string;eager?:boolean}){
  const commerce=useCommerce();const ui=useUI();const {catalog}=useCatalog();const [open,setOpen]=useState(false);const selection=useVariantSelection(product.variants)
  const shopifyEnabled=Boolean(catalog?.site?.shopifyEnabled)
  const hero=product.media[0]?.publicUrl;const second=product.media[1]?.publicUrl||hero
  const badges=[product.newArrival?'NUEVO':'',product.bestSeller?'DESTACADO':''].filter(Boolean)
  const name=displayProductName(product);const subtitle=displayProductSubtitle(product)
  const {amount:priceAmount,isRange}=productPrice(product,shopifyEnabled)
  const available=product.variants.filter(v=>canBuy(v,shopifyEnabled))
  async function quickAdd(){
    if(available.length===1){await commerce.addLine(product,available[0]);ui.showToast(name+' agregado');ui.openCart();return}
    setOpen(v=>!v)
  }
  async function confirm(){
    const variant=selection.variant;if(!variant||!canBuy(variant,shopifyEnabled))return
    await commerce.addLine(product,variant);ui.showToast(name+' agregado');setOpen(false);ui.openCart()
  }
  return <article className={'card '+className} data-reveal="card" style={{'--i':index%4} as React.CSSProperties}>
    <Link className="media" to={'/product/'+product.slug} data-cursor="VER" aria-label={'Ver '+name}>
      <ImageWithFallback src={hero} alt={product.media[0]?.alt||name} loading={eager?'eager':'lazy'} fetchPriority={eager?'high':undefined} decoding="async"/>
      {second&&second!==hero&&<ImageWithFallback className="secondary" src={second} alt="" loading="lazy" decoding="async"/>}
      <span className="index">{pad(index+1)}</span><div className="badges">{badges.map(b=><span key={b}>{b}</span>)}</div><span className="focus">VER ↗</span>
    </Link>
    <div className="meta"><div><Link to={'/product/'+product.slug}><h3>{name}</h3></Link><p>{subtitle}</p></div><b>{moneyFrom(priceAmount,isRange)}</b></div>
    <div className="card-actions"><button onClick={quickAdd} data-cursor="AGREGAR" aria-expanded={open} disabled={!available.length}>{available.length?'AGREGAR RÁPIDO +':'AGOTADO'}</button></div>
    {open&&available.length>1&&<div className="quick-picker" role="group" aria-label={'Selecciona talla para '+name}>
      <div className="quick-picker-head"><span>{selection.hasColors?'COLOR Y TALLA':'SELECCIONA TU TALLA'}</span><button onClick={()=>setOpen(false)} aria-label="Cerrar selector">×</button></div>
      {selection.hasColors&&<div className="quick-sizes quick-colors" role="group" aria-label="Color">{selection.colors.map(c=>{const buyable=product.variants.some(v=>(v.color||'').trim()===c&&canBuy(v,shopifyEnabled));return <button key={c||'_'} className={selection.color===c?'selected':''} aria-pressed={selection.color===c} disabled={!buyable} onClick={()=>selection.selectColor(c)}>{colorLabel(c)}</button>})}</div>}
      <div className="quick-sizes" role="group" aria-label="Talla">{selection.sizeOptions.map(v=><button key={v.id} className={selection.size===v.size?'selected':''} aria-pressed={selection.size===v.size} disabled={!canBuy(v,shopifyEnabled)} onClick={()=>selection.selectSize(v.size)}>{v.size}</button>)}</div>
      <button className="quick-confirm" disabled={!selection.variant} onClick={confirm}>AGREGAR AL CARRITO</button>
    </div>}
  </article>
}
