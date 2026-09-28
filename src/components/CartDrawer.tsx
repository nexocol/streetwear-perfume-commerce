import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/CommerceProvider'
import { useCatalog } from '../context/CatalogContext'
import { useUI } from '../context/UIContext'
import { money } from '../lib/format'
import { selectedVariantPrice } from '../lib/pricing'
import { ImageWithFallback } from './ImageWithFallback'
import { PreCheckout } from './PreCheckout'
import { displayProductName } from '../lib/clientContent'
import type { CheckoutContext } from '../lib/shippingRegions'

export function CartDrawer(){
  const commerce=useCommerce();const ui=useUI();const {catalog}=useCatalog();const count=commerce.lines.reduce((n,l)=>n+l.quantity,0)
  const shopifyEnabled=Boolean(catalog?.site?.shopifyEnabled)
  const [preOpen,setPreOpen]=useState(false)
  const [checkoutBusy,setCheckoutBusy]=useState(false);const [checkoutError,setCheckoutError]=useState<string|null>(null)
  const linePrices=commerce.lines.map(l=>selectedVariantPrice(l.variant,l.product,shopifyEnabled))
  const allPriced=linePrices.length>0&&linePrices.every(v=>v!=null)
  const subtotal=allPriced?commerce.lines.reduce((sum,l,i)=>sum+(linePrices[i]as number)*l.quantity,0):null
  function openCheckout(){
    if(!shopifyEnabled)return
    setCheckoutError(null);setPreOpen(true)
  }
  async function handleConfirm(context:CheckoutContext){
    setCheckoutBusy(true);setCheckoutError(null)
    const result=await commerce.startCheckout(context)
    if(result.ok)window.location.href=result.checkoutUrl
    else{setCheckoutError(result.error);setCheckoutBusy(false)}
  }
  return <><div className="backdrop" onClick={ui.closeCart}></div><aside className="cart" aria-label="Carrito" aria-hidden={!ui.cartOpen}>
    <header><span>CARRITO / {count}</span><button onClick={ui.closeCart} aria-label="Cerrar carrito">×</button></header>
    <div className="cart-items">{commerce.lines.length?commerce.lines.map((line,i)=>{const name=displayProductName(line.product);return <article className="cart-item" key={line.key}><ImageWithFallback src={line.product.media[0]?.publicUrl} alt={name}/><div className="cart-item-info"><b>{name}</b>{line.variant.color?.trim()&&<span data-testid="cart-color">COLOR / {line.variant.color.trim()}</span>}<span data-testid="cart-size">{line.variant.size==='Única'?'OPCIÓN':'TALLA'} / {line.variant.size}</span><strong>{money(linePrices[i],'detail')}</strong><div className="quantity"><button onClick={()=>commerce.updateLine(line.key,line.quantity-1)}>−</button><span>{line.quantity}</span><button onClick={()=>commerce.updateLine(line.key,line.quantity+1)}>+</button></div><button className="remove" onClick={()=>commerce.removeLine(line.key)}>ELIMINAR</button></div></article>}):<div className="empty-cart"><span>TU CARRITO ESTÁ VACÍO.</span><Link to="/shop" onClick={ui.closeCart}>VER LA TIENDA ↗</Link></div>}</div>
    <footer><div><span>SUBTOTAL</span><b>{subtotal==null?'—':money(subtotal)}</b></div>{commerce.checkoutEnabled?<><button className="btn light wide" disabled={commerce.lines.length===0||!allPriced} onClick={openCheckout}>FINALIZAR COMPRA</button>{!allPriced&&commerce.lines.length>0&&<p className="cart-checkout-error">Algunos precios aún no están disponibles. Intenta de nuevo en unos segundos.</p>}</>:<button className="btn light wide" disabled>CHECKOUT — PRÓXIMAMENTE</button>}</footer>
  </aside>
  <PreCheckout open={preOpen} onClose={()=>{if(!checkoutBusy)setPreOpen(false)}} productsSubtotal={subtotal} onConfirm={handleConfirm} busy={checkoutBusy} error={checkoutError}/>
  </>
}
