import { Navigate, useParams } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { ProductGallery } from '../components/ProductGallery'
import { ProductInfo } from '../components/ProductInfo'
import { RelatedProducts } from '../components/RelatedProducts'
import { TrustRail } from '../components/TrustRail'
export function ProductPage(){
  const {slug}=useParams();const {catalog,productBySlug}=useCatalog();if(!catalog)return null
  const product=slug?productBySlug(slug):undefined;if(!product)return <Navigate to="/shop" replace/>
  return <main id="main" className="pdp-page"><section className="pdp"><ProductGallery media={product.media} name={product.name}/><ProductInfo product={product}/></section><RelatedProducts product={product} all={catalog.products}/><TrustRail hideSize={product.category==='Perfumes'}/></main>
}
