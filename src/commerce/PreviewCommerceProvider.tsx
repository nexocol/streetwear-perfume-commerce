import { useEffect, useMemo, useState } from 'react'
import type { Product, Variant, CartLine, HydratedCartLine } from '../types'
import type { CommerceAdapter } from './types'
import { useCatalog } from '../context/CatalogContext'

const KEY='streetwear.cart.v3'
const read=():CartLine[]=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
const write=(lines:CartLine[])=>localStorage.setItem(KEY,JSON.stringify(lines))

export function usePreviewCommerce():CommerceAdapter{
  const {catalog}=useCatalog()
  const [raw,setRaw]=useState<CartLine[]>(read)
  useEffect(()=>write(raw),[raw])
  const lines=useMemo<HydratedCartLine[]>(()=>raw.flatMap(line=>{
    const product=catalog?.products.find(p=>p.id===line.productId)
    const variant=product?.variants.find(v=>v.id===line.variantId)
    return product&&variant?[{...line,product,variant}]:[]
  }),[raw,catalog])
  async function addLine(product:Product,variant:Variant){setRaw(current=>{const key=`${product.id}:${variant.id}`;const found=current.find(x=>x.key===key);return found?current.map(x=>x.key===key?{...x,quantity:x.quantity+1}:x):[...current,{key,productId:product.id,variantId:variant.id,quantity:1}]})}
  async function updateLine(key:string,quantity:number){setRaw(current=>current.map(x=>x.key===key?{...x,quantity}:x).filter(x=>x.quantity>0))}
  async function removeLine(key:string){setRaw(current=>current.filter(x=>x.key!==key))}
  async function clear(){setRaw([])}
  return {lines,addLine,updateLine,removeLine,clear,checkoutUrl:null,checkoutEnabled:false}
}
