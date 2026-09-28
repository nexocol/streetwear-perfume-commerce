import type { CommerceAdapter } from './types'
import { useLocalCart } from './useLocalCart'

export function usePreviewCommerce():CommerceAdapter{
  const cart=useLocalCart()
  async function startCheckout(){return {ok:false as const,error:'Checkout no disponible en modo preview.'}}
  return {...cart,checkoutEnabled:false,startCheckout}
}
