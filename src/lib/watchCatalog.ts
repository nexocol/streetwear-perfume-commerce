import type { Product, ProductMedia, Variant } from '../types'

export function isWatchFamily(product:Product){
  return product.category==='Relojería'&&product.variants.length>1
}

/** Existing media alts end in the exact variant label. Exact matching keeps Azul apart from Azul claro. */
export function mediaForVariant(product:Product,variant:Variant):ProductMedia[]{
  const label=(variant.color||'').trim().toLocaleLowerCase('es')
  return product.media.filter(media=>{
    const alt=media.alt?.toLocaleLowerCase('es')||''
    if(product.slug==='buzo-supreme')return alt.startsWith(`buzo supreme ${label} frente y espalda`)
    return alt.split('·').at(-1)?.trim()===label
  })
}

export function expandWatchProducts(products:Product[]):Product[]{
  return products.flatMap(product=>{
    if(!isWatchFamily(product))return [product]
    return product.variants.map(variant=>({
      ...product,
      name:`${product.name} · ${variant.color||variant.size}`,
      color:variant.color,
      variants:[variant],
      media:mediaForVariant(product,variant),
      listingVariantId:variant.shopifyVariantId||variant.id,
      listingKey:`${product.id}::${variant.id}`,
    }))
  })
}

export function productLink(product:Product){
  const path='/product/'+product.slug
  return product.listingVariantId?path+'?variant='+encodeURIComponent(product.listingVariantId):path
}
