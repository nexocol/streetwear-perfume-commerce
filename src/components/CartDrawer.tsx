import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/CommerceProvider'
import { useUI } from '../context/UIContext'
import { money } from '../lib/format'
import { ImageWithFallback } from './ImageWithFallback'
import { displayProductName } from '../lib/clientContent'

export function CartDrawer(){
  const commerce=useCommerce();const ui=useUI();const count=commerce.lines.reduce((n,l)=>n+l.quantity,0)
  const prices=commerce.lines.map(l=>l.variant.price??l.product.price);const allPriced=prices.length>0&&prices.every(v=>v!=null)
  const subtotal=allPriced?commerce.lines.reduce((sum,l)=>sum+(l.variant.price??l.product.price??0)*l.quantity,0):null
  return <><div className="backdrop" onClick={ui.closeCart}></div><aside className="cart" aria-label="Carrito" aria-hidden={!ui.cartOpen}>
    <header><span>CARRITO / {count}</span><button onClick={ui.closeCart} aria-label="Cerrar carrito">×</button></header>
    <div className="cart-items">{commerce.lines.length?commerce.lines.map(line=>{const name=displayProductName(line.product);return <article className="cart-item" key={line.key}><ImageWithFallback src={line.product.media[0]?.publicUrl} alt={name}/><div className="cart-item-info"><b>{name}</b>{line.variant.color?.trim()&&<span data-testid="cart-color">COLOR / {line.variant.color.trim()}</span>}<span data-testid="cart-size">{line.variant.size==='Única'?'OPCIÓN':'TALLA'} / {line.variant.size}</span><strong>{money(line.variant.price??line.product.price)}</strong><div className="quantity"><button onClick={()=>commerce.updateLine(line.key,line.quantity-1)}>−</button><span>{line.quantity}</span><button onClick={()=>commerce.updateLine(line.key,line.quantity+1)}>+</button></div><button className="remove" onClick={()=>commerce.removeLine(line.key)}>ELIMINAR</button></div></article>}):<div className="empty-cart"><span>TU CARRITO ESTÁ VACÍO.</span><Link to="/shop" onClick={ui.closeCart}>VER LA TIENDA ↗</Link></div>}</div>
    <footer><div><span>SUBTOTAL</span><b>{subtotal==null?'—':money(subtotal)}</b></div>{commerce.checkoutEnabled&&commerce.checkoutUrl?<a className="btn light wide" href={commerce.checkoutUrl}>FINALIZAR COMPRA</a>:<button className="btn light wide" disabled>CHECKOUT — PRÓXIMAMENTE</button>}</footer>
  </aside></>
}
