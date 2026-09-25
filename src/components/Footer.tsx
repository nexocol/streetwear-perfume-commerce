import { Link } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { useUI } from '../context/UIContext'
import { BrandMark, BRAND_FALLBACK_NAME } from './BrandMark'
export function Footer(){
  const {catalog}=useCatalog(); const ui=useUI(); const name=catalog?.site.brandName||BRAND_FALLBACK_NAME; const logo=catalog?.site.logoUrl
  return <footer className="footer"><div className="footer-big">DROP / 001</div><div className="footer-grid">
    <div><span>TIENDA</span><Link to="/shop">Todos los productos</Link><Link to="/shop?cat=Jeans">Pantalones</Link></div>
    <div><span>AYUDA</span><button onClick={()=>ui.openInfo('size')}>Guía de tallas</button><button onClick={()=>ui.openInfo('changes')}>Cambios</button></div>
    <div><span>COMPRA</span><button onClick={()=>ui.openInfo('advice')}>Asesoría</button><button onClick={()=>ui.openInfo('shipping')}>Envíos y métodos de pago</button></div>
    <div className="footer-brand"><BrandMark name={name} logo={logo}/><small>DROP / 001 / 2026</small></div>
  </div></footer>
}
