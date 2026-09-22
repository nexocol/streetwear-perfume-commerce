import type { Product } from '../types'
import { ProductGrid } from './ProductGrid'
export function relatedProducts(product:Product,all:Product[]){
  return all.filter(p=>p.id!==product.id).map(p=>{let score=0;if(p.category===product.category)score+=5;if(product.fit&&p.fit===product.fit)score+=3;score+=p.collections.filter(c=>product.collections.some(pc=>pc.id===c.id)).length*2;return{p,score}}).sort((a,b)=>b.score-a.score||a.p.sortOrder-b.p.sortOrder).slice(0,4).map(x=>x.p)
}
export function RelatedProducts({product,all}:{product:Product;all:Product[]}){
  const items=relatedProducts(product,all);if(!items.length)return null
  return <section className="related"><div className="related-head"><span>RELACIONADOS</span><h2>TAMBIÉN TE PUEDE GUSTAR</h2></div><ProductGrid products={items} className="related-grid"/></section>
}
