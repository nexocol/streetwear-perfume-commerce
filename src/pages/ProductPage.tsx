import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { ProductGallery } from '../components/ProductGallery'
import { ProductInfo } from '../components/ProductInfo'
import { RelatedProducts } from '../components/RelatedProducts'
import { TrustRail } from '../components/TrustRail'
import { useState } from 'react'
import { useVariantSelection } from '../lib/variants'
import { mediaForVariant, isWatchFamily } from '../lib/watchCatalog'
import type { Product } from '../types'

function ProductDetail({product,initialVariantId,initialColor}:{product:Product;initialVariantId:string|null;initialColor:string|null}){
  const {catalog}=useCatalog()
  const [,setParams]=useSearchParams()
  const selection=useVariantSelection(product.variants,Boolean(catalog?.site.shopifyEnabled),initialVariantId,initialColor)
  const [selectedColor,setSelectedColor]=useState(false)
  const explicitSelection=Boolean(initialVariantId||initialColor||selectedColor)
  const colorVariant=selection.color?product.variants.find(v=>(v.color||'').trim()===selection.color):undefined
  const selectedMedia=colorVariant?mediaForVariant(product,colorVariant):selection.variant?mediaForVariant(product,selection.variant):[]
  const media=explicitSelection&&selectedMedia.length
    ? isWatchFamily(product)?selectedMedia:[...selectedMedia,...product.media.filter(item=>!selectedMedia.some(match=>match.id===item.id))]
    :product.media
  function selectVariant(variantId:string|null,color:string|null){
    const next=new URLSearchParams()
    if(variantId)next.set('variant',variantId)
    else if(color)next.set('color',color)
    setParams(next,{replace:true})
  }
  function selectColor(color:string){
    selection.selectColor(color)
    setSelectedColor(true)
    if(!isWatchFamily(product))return
    const next=product.variants.find(v=>(v.color||'').trim()===color&&v.size===selection.size)
    selectVariant(next?.shopifyVariantId||next?.id||null,color)
  }
  function selectSize(size:string){
    selection.selectSize(size)
    if(!isWatchFamily(product))return
    const next=product.variants.find(v=>(v.color||'').trim()===(selection.color||'')&&v.size===size)
      ||(!selection.hasColors?product.variants.find(v=>v.size===size):undefined)
    selectVariant(next?.shopifyVariantId||next?.id||null,selection.color)
  }
  return <main id="main" className="pdp-page"><section className="pdp"><ProductGallery key={initialVariantId||initialColor||'default'} media={media} name={product.name} supreme={product.slug==='buzo-supreme'}/><ProductInfo product={product} selection={selection} onSelectColor={selectColor} onSelectSize={selectSize}/></section><RelatedProducts product={product} all={catalog?.products||[]}/><TrustRail hideSize={product.category==='Perfumes'||product.category==='Relojería'}/></main>
}
export function ProductPage(){
  const {slug}=useParams();const [params]=useSearchParams();const {catalog,productBySlug}=useCatalog();if(!catalog)return null
  const product=slug?productBySlug(slug):undefined;if(!product)return <Navigate to="/shop" replace/>
  const variant=params.get('variant');const color=params.get('color')
  return <ProductDetail key={product.id+'|'+(variant||'')+'|'+(color||'')} product={product} initialVariantId={variant} initialColor={color}/>
}
