import type { Product } from '../types'
import { useCatalog } from '../context/CatalogContext'
import { availableProductsFirst } from '../lib/availability'
import { ProductCard } from './ProductCard'
export function ProductGrid({products,className='grid'}:{products:Product[];className?:string}){
  const {catalog}=useCatalog()
  if(!products.length)return <div className="empty-results"><b>NO HAY RESULTADOS</b><p>Prueba con otra búsqueda o combinación de filtros.</p></div>
  const sorted=availableProductsFirst(products,Boolean(catalog?.site?.shopifyEnabled))
  return <div className={className}>{sorted.map((p,i)=><ProductCard key={p.id} product={p} index={i}/>)}</div>
}
