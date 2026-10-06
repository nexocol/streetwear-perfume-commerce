import type { Product } from '../types'
import { useCatalog } from '../context/CatalogContext'
import { productIsAvailable } from '../lib/availability'
import { ProductGrid } from './ProductGrid'
import { expandWatchProducts } from '../lib/watchCatalog'
export function relatedProducts(product:Product,all:Product[],shopifyEnabled=false){
  return expandWatchProducts(all).filter(p=>p.id!==product.id).map(p=>{let score=0;if(p.category===product.category)score+=5;if(product.fit&&p.fit===product.fit)score+=3;score+=p.collections.filter(c=>product.collections.some(pc=>pc.id===c.id)).length*2;return{p,score,available:productIsAvailable(p,shopifyEnabled)}}).sort((a,b)=>Number(b.available)-Number(a.available)||b.score-a.score||a.p.sortOrder-b.p.sortOrder).slice(0,4).map(x=>x.p)
}
export function RelatedProducts({product,all}:{product:Product;all:Product[]}){
  const {catalog}=useCatalog();const items=relatedProducts(product,all,Boolean(catalog?.site?.shopifyEnabled));if(!items.length)return null
  return <section className="related" aria-labelledby="related-title"><div className="related-head"><span>RELACIONADOS</span><h2 id="related-title">TAMBIÉN TE PUEDE GUSTAR</h2></div><ProductGrid products={items} className="related-grid"/></section>
}
