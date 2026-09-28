import type { Product, Variant, HydratedCartLine } from '../types'
import type { CheckoutContext } from '../lib/shippingRegions'
export type CheckoutResult={ok:true;checkoutUrl:string}|{ok:false;error:string}
export interface CommerceAdapter{
  lines:HydratedCartLine[]
  addLine:(product:Product,variant:Variant)=>Promise<void>
  updateLine:(key:string,quantity:number)=>Promise<void>
  removeLine:(key:string)=>Promise<void>
  clear:()=>Promise<void>
  checkoutEnabled:boolean
  startCheckout:(context:CheckoutContext)=>Promise<CheckoutResult>
}
