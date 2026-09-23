import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { ProductCard } from '../components/ProductCard'
import { TrustRail } from '../components/TrustRail'
import { ImageWithFallback } from '../components/ImageWithFallback'

const marquee = 'DENIM — STREETWEAR — FRAGRANCE — DROP 001 — '

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
  const headlineLines=(cfg.heroHeadline||'DROP / 001').split(/\\n|\n/).filter(Boolean).slice(0,3)
  const categories=[
    {label:'DENIM',value:'Jeans',to:'/shop?cat=Jeans',index:'01'},
    {label:'STREETWEAR',value:'Streetwear',to:'/shop?cat=Streetwear',index:'02'},
    {label:'FRAGRANCE',value:'Perfumes',to:'/shop?cat=Perfumes',index:'03'},
  ]

  return <main id="main">
    <section className="hero" data-depth-section>
      <div className="hero-meta" data-reveal="meta"><span>DROP / 001</span><span>COLOMBIA / 2026</span></div>
      <div className="hero-campaign">
        <Link className="hero-main-frame" to={'/product/'+hero.slug} data-cursor="VER" data-depth="1">
          <ImageWithFallback src={hero.media[0]?.publicUrl} alt={hero.media[0]?.alt||hero.name} fetchPriority="high"/>
          <span className="hero-image-caption"><b>{hero.name}</b><small>{hero.fit||hero.category}</small></span>
        </Link>
        {secondary&&<Link className="hero-secondary" to={'/product/'+secondary.slug} data-cursor="VER" data-depth="-1">
          <ImageWithFallback src={secondary.media[0]?.publicUrl} alt={secondary.media[0]?.alt||secondary.name}/><span>{secondary.name}</span>
        </Link>}
      </div>
      <div className="hero-copy" data-reveal="mask">
        <span className="eyebrow">{brand} / NUEVA SELECCIÓN</span>
        <h1 className="hero-title" aria-label={cfg.heroHeadline}>{headlineLines.map((line,i)=><span className="hero-title-line" key={line+i}>{line}</span>)}</h1>
        <div className="hero-bottom"><p>{cfg.heroSubheadline}</p><div className="hero-actions"><Link to="/shop" data-magnetic data-cursor="TIENDA" className="btn dark">VER LA COLECCIÓN</Link><Link to={'/product/'+hero.slug} data-cursor="VER" className="text-action">VER PRODUCTO ↗</Link></div></div>
      </div>
    </section>

    <div className="ticker" aria-label="Categorías del drop"><div className="ticker-track"><div className="ticker-group">{marquee.repeat(4)}</div><div className="ticker-group" aria-hidden="true">{marquee.repeat(4)}</div></div></div>

    <section className="featured-section" aria-labelledby="drop-title">
      <div className="section-heading" data-reveal="meta"><div><span>02 / DROP</span><p>PRODUCT DISCOVERY</p></div><h2 id="drop-title">PIEZAS<br/>DESTACADAS</h2><Link to="/shop">VER TODO ↗</Link></div>
      <div className="featured-rail" data-cursor="DRAG">{selected.map((p,i)=><ProductCard key={p.id} product={p} index={i} eager={i<2} className={'featured-card featured-card-'+(i+1)}/>)}</div>
    </section>

    <section className="collections" aria-labelledby="category-title">
      <div className="collections-heading" data-reveal="mask"><span>03 / EXPLORA</span><h2 id="category-title">ENTRA<br/>POR TU ESTILO.</h2><p>Tres mundos, una sola selección. Navega por categoría sin perder de vista el producto.</p></div>
      <div className="category-stage" aria-hidden="true">{preview?<ImageWithFallback key={preview.id} src={preview.publicUrl} alt=""/>:<div className="image-fallback"><span>Imagen próximamente</span></div>}<span>{categoryPreview==='Perfumes'?'FRAGRANCE':categoryPreview.toUpperCase()}</span></div>
      <nav className="collection-links" aria-label="Categorías">{categories.map(c=><Link key={c.value} to={c.to} onMouseEnter={()=>setCategoryPreview(c.value)} onFocus={()=>setCategoryPreview(c.value)}><span>{c.index}</span><b>{c.label}</b><em>EXPLORAR ↗</em></Link>)}</nav>
    </section>

    {fragrance&&<section id="fragrance" className="fragrance" data-depth-section>
      <div className="fragrance-visual" data-depth="1"><ImageWithFallback src={fragrance.media[0]?.publicUrl} alt={fragrance.media[0]?.alt||fragrance.name} loading="lazy"/></div>
      <div className="fragrance-scrim" aria-hidden="true"/>
      <div className="fragrance-copy" data-reveal="mask"><span>04 / FRAGRANCE EDIT</span><h2>FRAGRANCE<br/><i>/ 001</i></h2><p>Fragancias seleccionadas para completar el look. Producto real, información directa y una entrada clara al universo de perfume.</p><Link to={'/product/'+fragrance.slug} data-magnetic className="btn light">VER FRAGANCIAS</Link></div>
      {fragrance2&&<Link className="fragrance-object" to={'/product/'+fragrance2.slug} data-depth="-1" data-cursor="VER"><ImageWithFallback src={fragrance2.media[0]?.publicUrl} alt={fragrance2.media[0]?.alt||fragrance2.name} loading="lazy"/><span>{fragrance2.name}<b>↗</b></span></Link>}
    </section>}

    {editorial&&<section id="editorial" className="editorial" aria-labelledby="editorial-title">
      <div className="editorial-meta"><span>05 / LOOKBOOK</span><span>CAMPAIGN / 001</span></div>
      <div className="editorial-image" data-reveal="image"><ImageWithFallback src={editorial.media[0]?.publicUrl||cfg.editorialImageUrl||undefined} alt="Selección editorial de prendas reales del catálogo" loading="lazy"/></div>
      <div className="editorial-copy" data-reveal="mask"><h2 id="editorial-title"><span>LLEVA</span><span className="editorial-title-bridge">EL DROP</span><i>AFUERA.</i></h2><p>Una lectura más editorial de la selección: proporción, textura y actitud sin alejarse de lo que realmente puedes comprar.</p><Link to="/shop" className="text-action">VER TIENDA ↗</Link></div>
      <span className="editorial-product-label">{editorial.name}</span>
    </section>}

    <TrustRail/>
  </main>
}
