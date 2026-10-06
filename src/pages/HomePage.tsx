import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { ProductCard } from '../components/ProductCard'
import { TrustRail } from '../components/TrustRail'
import { ArrowIcon } from '../components/ArrowIcon'
import { ImageWithFallback } from '../components/ImageWithFallback'
import { activeCatalogCategories, categoryListText, clientHomeHeadline, clientHomeSubheadline, displayCategory, displayProductName } from '../lib/clientContent'
import { availableProductsFirst } from '../lib/availability'
import { expandWatchProducts } from '../lib/watchCatalog'

export function HomePage(){
  const {catalog,productById}=useCatalog()
  const [categoryPreview,setCategoryPreview]=useState('')
  if(!catalog)return null

  const cfg=catalog.homepage
  const hero=productById(cfg.heroProductId)||catalog.products.find(p=>p.category==='Jeans')||catalog.products[0]
  const featured=(cfg.featuredProductIds.map(productById).filter(Boolean).slice(0,4) as typeof catalog.products)
  const selected=availableProductsFirst(expandWatchProducts(featured.length?featured:catalog.products.filter(p=>p.featured)),Boolean(catalog.site.shopifyEnabled)).slice(0,4)
  const fragrance=productById(cfg.fragrancePrimaryId)||catalog.products.find(p=>p.category==='Perfumes')
  const fragrance2=productById(cfg.fragranceSecondaryId)||catalog.products.find(p=>p.category==='Perfumes'&&p.id!==fragrance?.id)
  const editorial=productById(cfg.editorialProductId)||catalog.products.find(p=>p.category==='Streetwear')
  const activeCategories=useMemo(()=>activeCatalogCategories(catalog),[catalog])
  const commercialLabels=activeCategories.map(c=>displayCategory(c.name))
  const effectivePreview=activeCategories.some(c=>c.name===categoryPreview)?categoryPreview:(activeCategories[0]?.name||'')
  const preview=useMemo(()=>availableProductsFirst(expandWatchProducts(catalog.products.filter(p=>p.status==='active'&&p.category===effectivePreview)),Boolean(catalog.site.shopifyEnabled))[0]?.media[0],[catalog.products,catalog.site.shopifyEnabled,effectivePreview])
  if(!hero)return <main id="main" className="empty-results"><b>SIN PRODUCTOS ACTIVOS</b></main>

  const brand=catalog.site.brandName||'EL PUNTO'
  const headline=clientHomeHeadline(cfg.heroHeadline)
  const headlineLines=headline.split(/\\n|\n/).filter(Boolean).slice(0,3)
  // Display caps run ~1.18em each: size the headline so its longest word always fits the column (default wraps TODO EL / DROP.).
  const headlineFit=Math.max(8.4,...headline.split(/\s+|\\n/).map(word=>word.length*1.18))
  const subheadline=clientHomeSubheadline(cfg.heroSubheadline,commercialLabels)
  const categories=activeCategories.map((category,i)=>({label:displayCategory(category.name).toUpperCase(),value:category.name,to:'/shop?cat='+encodeURIComponent(category.name),index:String(i+1).padStart(2,'0')}))
  const separator=' · '
  const marquee=commercialLabels.map(x=>x.toUpperCase()).join(separator)+separator

  return <main id="main">
    <section className="hero premium-hero" data-depth-section>
      <div className="hero-ambient" aria-hidden="true"/>
      <div className="hero-copy">
        <span className="eyebrow">{brand} — STREETWEAR + PERFUMERÍA</span>
        <h1 className="hero-title" aria-label={headline} style={{'--headline-fit':headlineFit} as React.CSSProperties}>{headlineLines.map((line,i)=><span className="hero-title-line" key={line+i}>{line}</span>)}</h1>
        <div className="hero-bottom"><p>{subheadline}</p><div className="hero-actions"><Link to="/shop" data-cursor="TIENDA" className="btn dark hero-shop-cta"><span>VER LA COLECCIÓN</span><ArrowIcon direction="right"/></Link></div></div>
        <div className="hero-index">
          <div className="hero-index-head"><span>COMPRA DIRECTO</span><Link className="hero-index-all" to="/shop" data-cursor="ABRIR">TIENDA <ArrowIcon/></Link></div>
          <nav className="hero-category-jump" aria-label="Comprar por categoría">{categories.map(c=><Link key={c.value} to={c.to} data-cursor="ABRIR"><span className="hero-category-number" aria-hidden="true">{c.index}</span><span className="hero-category-label">{c.label}</span><ArrowIcon/></Link>)}</nav>
        </div>
      </div>
      <figure className="hero-visual">
        <Link className="hero-main-frame" to={'/product/'+hero.slug} data-cursor="VER" data-depth="1">
          <ImageWithFallback src={hero.media[0]?.publicUrl} alt={hero.media[0]?.alt||displayProductName(hero)} fetchPriority="high"/>
        </Link>
        <figcaption className="hero-caption"><Link to={'/product/'+hero.slug}><div className="hero-product-meta"><b>{displayProductName(hero)}</b><span>{hero.fit||displayCategory(hero.category)}</span></div><em>VER PRODUCTO <ArrowIcon/></em></Link></figcaption>
      </figure>
    </section>

    <div className="ticker" aria-label="Categorías de la tienda"><div className="ticker-track"><div className="ticker-group">{marquee.repeat(4)}</div><div className="ticker-group" aria-hidden="true">{marquee.repeat(4)}</div></div></div>

    <section className="featured-section" aria-labelledby="drop-title">
      <div className="section-heading" data-reveal="meta"><div><span>02 / SELECCIÓN</span><p>PRODUCTOS DESTACADOS</p></div><h2 id="drop-title">PIEZAS<br/>DESTACADAS</h2><Link to="/shop">VER TODO <ArrowIcon/></Link></div>
      <div className="featured-rail" data-cursor="DRAG">{selected.map((p,i)=><ProductCard key={p.listingKey||p.id} product={p} index={i} eager={i<2} className={'featured-card featured-card-'+(i+1)}/>)}</div>
    </section>

    <section className="collections" aria-labelledby="category-title">
      <div className="collections-heading" data-reveal="mask"><span>03 / CATEGORÍAS</span><h2 id="category-title">ELIGE<br/>TU SECCIÓN.</h2><p>{categoryListText(commercialLabels)}. Entra directamente a la línea que estás buscando.</p></div>
      <div className="category-stage premium-category-stage" aria-hidden="true">{preview?<ImageWithFallback key={preview.id} src={preview.publicUrl} alt=""/>:<div className="image-fallback"><span>Imagen próximamente</span></div>}<span>{displayCategory(effectivePreview).toUpperCase()}</span></div>
      <nav className="collection-links premium-collection-links" aria-label="Categorías">{categories.map(c=><Link key={c.value} to={c.to} onMouseEnter={()=>setCategoryPreview(c.value)} onFocus={()=>setCategoryPreview(c.value)}><span>{c.index}</span><b>{c.label}</b><em><span className="cta-text">VER PRODUCTOS </span><ArrowIcon/></em></Link>)}</nav>
    </section>

    {fragrance&&<section id="fragrance" className="fragrance" data-depth-section>
      <div className="fragrance-visual" data-depth="1"><ImageWithFallback src={fragrance.media[0]?.publicUrl} alt={fragrance.media[0]?.alt||displayProductName(fragrance)} loading="lazy"/></div>
      <div className="fragrance-scrim" aria-hidden="true"/>
      <div className="fragrance-copy" data-reveal="mask"><span>04 / PERFUMES</span><h2>PERFUMES<br/><i>/ 001</i></h2><p>Explora los perfumes disponibles y consulta en cada producto su composición, notas y perfil olfativo.</p><Link to={'/product/'+fragrance.slug} data-magnetic className="btn light">VER PERFUMES</Link></div>
      {fragrance2&&<Link className="fragrance-object" to={'/product/'+fragrance2.slug} data-depth="-1" data-cursor="VER"><ImageWithFallback src={fragrance2.media[0]?.publicUrl} alt={fragrance2.media[0]?.alt||displayProductName(fragrance2)} loading="lazy"/><span>{displayProductName(fragrance2)}<ArrowIcon/></span></Link>}
    </section>}

    {editorial&&<section id="editorial" className="editorial" aria-labelledby="editorial-title">
      <div className="editorial-meta"><span>05 / SELECCIÓN</span><span>DROP / 001</span></div>
      <Link className="editorial-image" to={'/product/'+editorial.slug} data-cursor="VER"><ImageWithFallback src={editorial.media[0]?.publicUrl||cfg.editorialImageUrl||undefined} alt={editorial.media[0]?.alt||displayProductName(editorial)} loading="lazy"/></Link>
      <div className="editorial-copy">
        <h2 id="editorial-title"><span className="editorial-title-bridge">ENCUENTRA</span><span className="editorial-title-bridge">TU ESTILO</span><i>AQUÍ.</i></h2>
        <p>Explora las prendas disponibles y entra directamente al producto que quieres comprar.</p>
        <div className="editorial-actions"><Link to="/shop" data-magnetic className="btn dark">VER TIENDA</Link><Link to={'/product/'+editorial.slug} className="text-action">{displayProductName(editorial)} <ArrowIcon/></Link></div>
      </div>
    </section>}

    <TrustRail/>
  </main>
}
