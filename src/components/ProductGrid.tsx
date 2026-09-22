import type { Product } from '../types'
import { ProductCard } from './ProductCard'
export function ProductGrid({products,className='grid'}:{products:Product[];className?:string}){
  if(!products.length)return <div className="empty-results"><b>NO HAY RESULTADOS</b><p>Prueba con otra búsqueda o combinación de filtros.</p></div>
  return <div className={className}>{products.map((p,i)=><ProductCard key={p.id} product={p} index={i}/>)}</div>
}
