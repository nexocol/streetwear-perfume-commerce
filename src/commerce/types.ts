import type { Product, Variant, HydratedCartLine } from '../types'
export interface CommerceAdapter{
  lines:HydratedCartLine[]
  addLine:(product:Product,variant:Variant)=>Promise<void>
  updateLine:(key:string,quantity:number)=>Promise<void>
  removeLine:(key:string)=>Promise<void>
  clear:()=>Promise<void>
  checkoutUrl:string|null
  checkoutEnabled:boolean
}
