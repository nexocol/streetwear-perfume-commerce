import { useMemo, useState } from 'react'
import type { Variant } from '../types'

export const colorKey=(v:Variant)=>(v.color||'').trim()
export const isBuyable=(v:Variant)=>v.available&&v.stock!==0
export const colorLabel=(color:string)=>color||'Único'

export function variantColors(variants:Variant[]):string[]{
  return [...new Set(variants.map(colorKey))]
}
export function availableColors(variants:Variant[]):string[]{
  return variantColors(variants).filter(c=>variants.some(v=>colorKey(v)===c&&isBuyable(v)))
}
export function variantSummary(v:Variant){
  return v.color?.trim()?v.color.trim()+' · '+v.size:v.size
}

export function useVariantSelection(variants:Variant[]){
  const colors=useMemo(()=>variantColors(variants),[variants])
  const hasColors=colors.length>1
  const [pickedColor,setPickedColor]=useState<string|null>(null)
  const [size,setSize]=useState<string|null>(variants.length===1?variants[0].size:null)
  const defaultColor=useMemo(()=>colors.find(c=>variants.some(v=>colorKey(v)===c&&isBuyable(v)))??colors[0]??'',[colors,variants])
  const color=hasColors?(pickedColor!==null&&colors.includes(pickedColor)?pickedColor:defaultColor):null
  const sizeOptions=useMemo(()=>hasColors?variants.filter(v=>colorKey(v)===color):variants,[variants,hasColors,color])
  const variant=useMemo(()=>sizeOptions.find(v=>v.size===size)||null,[sizeOptions,size])
  function selectColor(next:string){
    setPickedColor(next)
    const stillThere=variants.some(v=>colorKey(v)===next&&v.size===size&&isBuyable(v))
    if(!stillThere)setSize(null)
  }
  return {colors,hasColors,color,sizeOptions,size,variant,selectColor,selectSize:setSize}
}
export type VariantSelection=ReturnType<typeof useVariantSelection>
