import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { ProductCard } from '../components/ProductCard'
import { TrustRail } from '../components/TrustRail'
import { ImageWithFallback } from '../components/ImageWithFallback'
import { clientHomeHeadline, clientHomeSubheadline, displayCategory, displayProductName } from '../lib/clientContent'

const marquee = 'PANTALONES — CAMISETAS — CONJUNTOS — PERFUMES — '

export function HomePage(){
  const {catalog,productById}=useCatalog()
  const [categoryPreview,setCategoryPreview]=useState('Jeans')
  if(!catalog)return null

  const cfg=catalog.homepage
  const hero=productById(cfg.heroProductId)||catalog.products.find(p=>p.category==='Jeans')||catalog.products[0]
  const secondary=productById(cfg.heroSecondaryProductId)||catalog.products.find(p=>p.id!==hero?.id&&p.category==='Jeans')
  const featured=(cfg.featuredProductIds.map(productById).filter(Boolean).slice(0,4) as typeof catalog.products)
  const selected=featured.length?featured:catalog.products.filter(p=>p.featured).slice(0,4)
  const fragrance=productById(cfg.fragrancePrimaryId)||catalog.products.find(p=>p.category==='Perfumes')
  const fragrance2=productById(cfg.fragranceSecondaryId)||catalog.products.find(p=>p.category==='Perfumes'&&p.id!==fragrance?.id)
  const editorial=productById(cfg.editorialProductId)||catalog.products.find(p=>p.category==='Streetwear')
  const preview=useMemo(()=>catalog.products.find(p=>p.category===categoryPreview)?.media[0],[catalog.products,categoryPreview])
  if(!hero)return <main id="main" className="empty-results"><b>SIN PRODUCTOS ACTIVOS</b></main>

  const brand=catalog.site.brandName||'STORE / 001'
  const headline=clientHomeHeadline(cfg.heroHeadline)
  const headlineLines=headline.split(/\\n|\n/).filter(Boolean).slice(0,3)
  const subheadline=clientHomeSubheadline(cfg.heroSubheadline)
  const categories=[
    {label:'PANTALONES',value:'Jeans',to:'/shop?cat=Jeans',index:'01'},
    {label:'CAMISETAS',value:'Streetwear',to:'/shop?cat=Streetwear',index:'02'},
    {label:'CONJUNTOS',value:'Conjuntos',to:'/shop?cat=Conjuntos',index:'03'},
    {label:'PERFUMES',value:'Perfumes',to:'/shop?cat=Perfumes',index:'04'},
  ]

  return <main id="main">
    <section className="hero" data-depth-section>
      <div className="hero-meta" data-reveal="meta"><span>DROP / 001</span><span>COLOMBIA / 2026</span></div>
      <div className="hero-campaign">
        <Link className="hero-main-frame" to={'/product/'+hero.slug} data-cursor="VER" data-depth="1">
          <ImageWithFallback src={hero.media[0]?.publicUrl} alt={hero.media[0]?.alt||displayProductName(hero)} fetchPriority="high"/>
          <span className="hero-image-caption"><b>{displayProductName(hero)}</b><small>{hero.fit||displayCategory(hero.category)}</small></span>
        </Link>
        {secondary&&<Link className="hero-secondary" to={'/product/'+secondary.slug} data-cursor="VER" data-depth="-1">
          <ImageWithFallback src={secondary.media[0]?.publicUrl} alt={secondary.media[0]?.alt||displayProductName(secondary)}/><span>{displayProductName(secondary)}</span>
        </Link>}
      </div>
      <div className="hero-copy" data-reveal="mask">
        <span className="eyebrow">{brand} / NUEVA SELECCIÓN</span>
        <h1 className="hero-title" aria-label={headline}>{headlineLines.map((line,i)=><span className="hero-title-line" key={line+i}>{line}</span>)}</h1>
        <div className="hero-bottom"><p>{subheadline}</p><div className="hero-actions"><Link to="/shop" data-magnetic data-cursor="TIENDA" className="btn dark">VER LA COLECCIÓN</Link><Link to={'/product/'+hero.slug} data-cursor="VER" className="text-action">VER PRODUCTO ↗</Link></div></div>
      </div>
    </section>

    <div className="ticker" aria-label="Categorías de la tienda"><div className="ticker-track"><div className="ticker-group">{marquee.repeat(4)}</div><div className="ticker-group" aria-hidden="true">{marquee.repeat(4)}</div></div></div>

    <section className="featured-section" aria-labelledby="drop-title">
      <div className="section-heading" data-reveal="meta"><div><span>02 / SELECCIÓN</span><p>PRODUCTOS DESTACADOS</p></div><h2 id="drop-title">PIEZAS<br/>DESTACADAS</h2><Link to="/shop">VER TODO ↗</Link></div>
      <div className="featured-rail" data-cursor="DRAG">{selected.map((p,i)=><ProductCard key={p.id} product={p} index={i} eager={i<2} className={'featured-card featured-card-'+(i+1)}/>)}</div>
    </section>

    <section className="collections" aria-labelledby="category-title">
      <div className="collections-heading" data-reveal="mask"><span>03 / CATEGORÍAS</span><h2 id="category-title">ELIGE<br/>TU SECCIÓN.</h2><p>Pantalones, camisetas, conjuntos y perfumes. Entra directamente a la línea que estás buscando.</p></div>
      <div className="category-stage" aria-hidden="true">{preview?<ImageWithFallback key={preview.id} src={preview.publicUrl} alt=""/>:<div className="image-fallback"><span>Imagen próximamente</span></div>}<span>{displayCategory(categoryPreview).toUpperCase()}</span></div>
      <nav className="collection-links" aria-label="Categorías">{categories.map(c=><Link key={c.value} to={c.to} onMouseEnter={()=>setCategoryPreview(c.value)} onFocus={()=>setCategoryPreview(c.value)}><span>{c.index}</span><b>{c.label}</b><em>VER PRODUCTOS ↗</em></Link>)}</nav>
    </section>

    {fragrance&&<section id="fragrance" className="fragrance" data-depth-section>
      <div className="fragrance-visual" data-depth="1"><ImageWithFallback src={fragrance.media[0]?.publicUrl} alt={fragrance.media[0]?.alt||displayProductName(fragrance)} loading="lazy"/></div>
      <div className="fragrance-scrim" aria-hidden="true"/>
      <div className="fragrance-copy" data-reveal="mask"><span>04 / PERFUMES</span><h2>PERFUMES<br/><i>/ 001</i></h2><p>Explora los perfumes disponibles y consulta en cada producto su composición, notas y perfil olfativo cuando estén confirmados.</p><Link to={'/product/'+fragrance.slug} data-magnetic className="btn light">VER PERFUMES</Link></div>
      {fragrance2&&<Link className="fragrance-object" to={'/product/'+fragrance2.slug} data-depth="-1" data-cursor="VER"><ImageWithFallback src={fragrance2.media[0]?.publicUrl} alt={fragrance2.media[0]?.alt||displayProductName(fragrance2)} loading="lazy"/><span>{displayProductName(fragrance2)}<b>↗</b></span></Link>}
    </section>}

    {editorial&&<section id="editorial" className="editorial" aria-labelledby="editorial-title">
      <div className="editorial-meta"><span>05 / SELECCIÓN</span><span>DROP / 001</span></div>
      <div className="editorial-image" data-reveal="image"><ImageWithFallback src={editorial.media[0]?.publicUrl||cfg.editorialImageUrl||undefined} alt="Prenda real de la selección" loading="lazy"/></div>
      <div className="editorial-copy" data-reveal="mask"><h2 id="editorial-title"><span>ENCUENTRA</span><span className="editorial-title-bridge">TU ESTILO</span><i>AQUÍ.</i></h2><p>Explora las prendas disponibles y entra directamente al producto que quieres comprar.</p><Link to="/shop" className="text-action">VER TIENDA ↗</Link></div>
      <span className="editorial-product-label">{displayProductName(editorial)}</span>
    </section>}

    <TrustRail/>
  </main>
}
