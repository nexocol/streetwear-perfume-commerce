import { Link } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { ProductGrid } from '../components/ProductGrid'
import { TrustRail } from '../components/TrustRail'
import { ImageWithFallback } from '../components/ImageWithFallback'

export function HomePage(){
  const {catalog,productById}=useCatalog();if(!catalog)return null
  const cfg=catalog.homepage
  const hero=productById(cfg.heroProductId)||catalog.products.find(p=>p.category==='Jeans')||catalog.products[0]
  const secondary=productById(cfg.heroSecondaryProductId)||catalog.products.find(p=>p.id!==hero?.id&&p.category==='Jeans')
  const featured=cfg.featuredProductIds.map(productById).filter(Boolean).slice(0,4) as typeof catalog.products
  const fragrance=productById(cfg.fragrancePrimaryId)||catalog.products.find(p=>p.category==='Perfumes')
  const fragrance2=productById(cfg.fragranceSecondaryId)||catalog.products.find(p=>p.category==='Perfumes'&&p.id!==fragrance?.id)
  const editorial=productById(cfg.editorialProductId)||catalog.products.find(p=>p.category==='Streetwear')
  if(!hero)return <main id="main" className="empty-results"><b>SIN PRODUCTOS ACTIVOS</b></main>
  const brand=catalog.site.brandName||'STORE / 001'
  return <main id="main">
    <section className="hero" data-depth-section>
      <div className="hero-brand-block" data-reveal="meta"><span>01 / DROP</span><strong>{brand}</strong><small>DROP / 001</small></div>
      <div className="hero-copy"><span className="eyebrow">NUEVA SELECCIÓN / 2026</span><h1 className="hero-title" aria-label={cfg.heroHeadline}>{cfg.heroHeadline.split('\n').map((line,i)=><span key={i}><span className="hero-line"><span style={{'--line':i} as React.CSSProperties}>{line}</span></span>{i===0&&<br/>}</span>)}</h1><p>{cfg.heroSubheadline}</p><div className="hero-actions"><Link to="/shop" data-magnetic data-cursor="TIENDA" className="btn dark">VER LA COLECCIÓN</Link><Link to={'/product/'+hero.slug} data-cursor="VER">VER DENIM ↗</Link></div></div>
      <div className="hero-visuals"><Link className="hero-main-frame" to={'/product/'+hero.slug} data-cursor="VER" data-depth="1"><ImageWithFallback src={hero.media[0]?.publicUrl} alt={hero.media[0]?.alt||hero.name} fetchPriority="high"/><span className="hero-visual-label">{hero.name}</span></Link>{secondary&&<Link className="hero-secondary" to={'/product/'+secondary.slug} data-cursor="VER" data-depth="-1"><ImageWithFallback src={secondary.media[0]?.publicUrl} alt={secondary.media[0]?.alt||secondary.name}/><span>{secondary.name}</span></Link>}</div><span className="hero-side-label">COLOMBIA / DROP 001</span>
    </section>
    <div className="ticker" aria-hidden="true"><div>DENIM — STREETWEAR — FRAGRANCE — DROP 001 — DENIM — STREETWEAR — FRAGRANCE — DROP 001 —</div></div>
    <section className="section featured-section"><div className="heading" data-reveal="mask"><div><span>02</span><p>SELECCIÓN</p></div><h2><span>DROP</span><br/><span>/ 001</span></h2><Link to="/shop">VER TODO ↗</Link></div><ProductGrid products={featured.length?featured:catalog.products.filter(p=>p.featured).slice(0,4)}/></section>
    <section className="collections"><div data-reveal="mask"><span>03 / CATEGORÍAS</span><h2><span>EXPLORA</span><br/><span>EL DROP</span></h2></div><div className="collection-links" data-reveal="list"><Link to="/shop?cat=Jeans"><span>01</span> DENIM <b>↗</b></Link><Link to="/shop?cat=Streetwear"><span>02</span> STREETWEAR <b>↗</b></Link><Link to="/shop?cat=Perfumes"><span>03</span> FRAGRANCE <b>↗</b></Link></div></section>
    {fragrance&&<section id="fragrance" className="fragrance" data-depth-section><div className="fragrance-img" data-depth="1"><ImageWithFallback src={fragrance.media[0]?.publicUrl} alt={fragrance.media[0]?.alt||fragrance.name} loading="lazy"/></div><div className="fragrance-copy" data-reveal="mask"><span>04 / FRAGRANCE EDIT</span><h2><span>FRAGRANCE</span><br/><span>/ 001</span></h2><p>Explora la selección de fragancias disponible en este drop.</p><Link to={'/product/'+fragrance.slug} data-magnetic className="btn light">VER FRAGANCIAS</Link></div>{fragrance2&&<Link className="fragrance-mini" to={'/product/'+fragrance2.slug} data-depth="-1"><ImageWithFallback src={fragrance2.media[0]?.publicUrl} alt={fragrance2.media[0]?.alt||fragrance2.name} loading="lazy"/><span>VER / 002 ↗</span></Link>}</section>}
    {editorial&&<section id="editorial" className="editorial"><div className="editorial-word" data-reveal="mask"><span>EDITORIAL</span><br/><span>/ 001</span></div><div className="editorial-img" data-reveal="image"><ImageWithFallback src={cfg.editorialImageUrl||editorial.media[0]?.publicUrl} alt="Selección editorial de prendas reales del catálogo" loading="lazy"/></div><div className="editorial-note" data-reveal="meta"><span>05 / LOOKBOOK</span><p>Explora las prendas desde otra perspectiva.</p><Link to="/shop">VER TIENDA ↗</Link></div></section>}
    <TrustRail/>
  </main>
}
