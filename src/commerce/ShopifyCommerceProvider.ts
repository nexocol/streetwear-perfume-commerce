import type { CommerceAdapter, CheckoutResult } from './types'
import type { CheckoutContext } from '../lib/shippingRegions'
import { useLocalCart } from './useLocalCart'

// Cart stays local (see useLocalCart); only checkout crosses the network, and only to our
// own Worker — the browser never talks to Shopify directly and never sees a Shopify ID.
export function useShopifyCommerce():CommerceAdapter{
  const cart=useLocalCart()
  async function startCheckout(context:CheckoutContext):Promise<CheckoutResult>{
    if(cart.lines.length===0)return {ok:false,error:'El carrito está vacío.'}
    try{
      const res=await fetch('/api/shopify/checkout',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({lines:cart.lines.map(l=>({variantId:l.variantId,quantity:l.quantity})),checkoutContext:context})
      })
      const body=await res.json().catch(()=>null)
      if(!res.ok||!body?.checkoutUrl)return {ok:false,error:body?.error||'No fue posible iniciar el checkout.'}
      return {ok:true,checkoutUrl:body.checkoutUrl}
    }catch(error){
      return {ok:false,error:error instanceof Error?error.message:'No fue posible iniciar el checkout.'}
    }
  }
  return {...cart,checkoutEnabled:true,startCheckout}
}
