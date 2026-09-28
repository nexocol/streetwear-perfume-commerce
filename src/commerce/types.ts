import type { Product, Variant, HydratedCartLine } from '../types'
export type CheckoutResult={ok:true;checkoutUrl:string}|{ok:false;error:string}
export interface CommerceAdapter{
  lines:HydratedCartLine[]
  addLine:(product:Product,variant:Variant)=>Promise<void>
  updateLine:(key:string,quantity:number)=>Promise<void>
  removeLine:(key:string)=>Promise<void>
  clear:()=>Promise<void>
  checkoutEnabled:boolean
  startCheckout:()=>Promise<CheckoutResult>
}
