import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { useCommerce } from '../commerce/CommerceProvider'
import { useUI } from '../context/UIContext'
import { BrandMark, BRAND_FALLBACK_NAME } from './BrandMark'
import { categoryShopLinks, displayProductName } from '../lib/clientContent'
import { ImageWithFallback } from './ImageWithFallback'
import { ArrowIcon } from './ArrowIcon'
import { expandWatchProducts } from '../lib/watchCatalog'

function SearchIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2"/></svg>}
function BagIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 8.5h13l1.2 11H4.3l1.2-11Z"/><path d="M8.6 9V6.7a3.4 3.4 0 0 1 6.8 0V9"/></svg>}

export function Header(){
  const {catalog}=useCatalog(); const commerce=useCommerce(); const ui=useUI(); const location=useLocation()
  const brand=useMemo(()=>({name:catalog?.site.brandName||BRAND_FALLBACK_NAME,logo:catalog?.site.logoUrl,season:'DROP / 001'}),[catalog])
  const categoryLinks=useMemo(()=>catalog?categoryShopLinks(catalog):[],[catalog])
  const [menuPreview,setMenuPreview]=useState('')
  const count=commerce.lines.reduce((n,l)=>n+l.quantity,0)
  const previewValue=menuPreview||categoryLinks[0]?.value||''
  const previewProduct=useMemo(()=>catalog?.products.find(p=>p.status==='active'&&p.category===previewValue),[catalog,previewValue])
  useEffect(()=>{ui.closeMenu();ui.closeSearch()},[location.pathname,location.search])
  useEffect(()=>{if(ui.menuOpen&&!menuPreview&&categoryLinks[0])setMenuPreview(categoryLinks[0].value)},[ui.menuOpen,menuPreview,categoryLinks])
  useEffect(()=>{
    const sync=()=>{
      const header=document.querySelector('[data-header]') as HTMLElement|null
      if(!header)return
      const sample=document.elementsFromPoint(innerWidth/2,Math.min(header.offsetHeight+8,innerHeight-1)).find(el=>!(el as HTMLElement).closest?.('[data-header]')) as HTMLElement|undefined
      const dark=Boolean(sample?.closest?.('.fragrance,.footer,.mobile-menu,.search-overlay'))
      header.classList.toggle('inverse',dark); header.classList.toggle('scrolled',scrollY>16)
    }
    sync(); addEventListener('scroll',sync,{passive:true}); addEventListener('resize',sync)
    return()=>{removeEventListener('scroll',sync);removeEventListener('resize',sync)}
  },[location.pathname])
  return <>
    <header className="nav premium-nav" data-header>
      <button className="nav-menu premium-menu-trigger" onClick={ui.openMenu} aria-label="Abrir menú de categorías">
        <span className="hamburger" aria-hidden="true"><i/><i/><i/></span><span>MENÚ</span>
      </button>
      <Link to="/" className="brand" data-cursor="ABRIR">
        <BrandMark name={brand.name} logo={brand.logo}/><span>{brand.season}</span>
      </Link>
      <nav className="legacy-nav" aria-label="Principal">
        <Link to="/shop" data-cursor="TIENDA">TIENDA</Link>
        <Link to="/#fragrance" data-cursor="ABRIR">FRAGRANCE</Link>
        <Link to="/#editorial" data-cursor="ABRIR">EDITORIAL</Link>
      </nav>
      <div className="nav-actions">
        <button className="nav-icon" onClick={ui.openSearch} data-cursor="BUSCAR" aria-label="Buscar"><SearchIcon/><span className="sr-only">Buscar</span></button>
        <button className="nav-icon bag-action" onClick={ui.openCart} data-cursor="ABRIR" aria-label={'Abrir carrito, '+count+' productos'}><BagIcon/><span className="bag-count">{count}</span><span className="sr-only">Carrito</span></button>
      </div>
    </header>
    <aside className={'mobile-menu premium-menu '+(ui.menuOpen?'open':'')} aria-hidden={!ui.menuOpen}>
      <div className="mobile-menu-top premium-menu-top">
        <span className="menu-brand"><BrandMark name={brand.name} logo={brand.logo}/></span>
        <span className="premium-menu-kicker">EXPLORA / {brand.season}</span>
        <button onClick={ui.closeMenu} aria-label="Cerrar menú">×</button>
      </div>
      <div className="premium-menu-body">
        <nav className="premium-menu-nav" aria-label="Navegación de tienda">
          <Link className="premium-menu-shop" to="/shop"><span>TIENDA</span><em>{expandWatchProducts(catalog?.products.filter(p=>p.status==='active')||[]).length}</em></Link>
          <div className="premium-menu-cats mobile-menu-cats" role="group" aria-label="Categorías">
            {categoryLinks.map((c,i)=><Link key={c.value} to={c.to} data-cat={c.value} onMouseEnter={()=>setMenuPreview(c.value)} onFocus={()=>setMenuPreview(c.value)}>
              <span>{String(i+1).padStart(2,'0')}</span><b>{c.label}</b><em><ArrowIcon/></em>
            </Link>)}
          </div>
          <div className="premium-menu-secondary">
            <Link to="/#fragrance">FRAGRANCE <ArrowIcon/></Link>
            <Link to="/#editorial">EDITORIAL <ArrowIcon/></Link>
            <button onClick={ui.openSearch}>BUSCAR <ArrowIcon/></button>
          </div>
        </nav>
        <div className="premium-menu-preview" aria-hidden="true">
          <div className="premium-menu-preview-frame">
            {previewProduct?<ImageWithFallback key={previewProduct.id} src={previewProduct.media[0]?.publicUrl} alt=""/>:<div className="image-fallback"><span>EL PUNTO</span></div>}
          </div>
          <div className="premium-menu-preview-meta">
            <span>{previewValue?previewValue.toUpperCase():'EL PUNTO'}</span>
            <b>{previewProduct?displayProductName(previewProduct):'DROP / 001'}</b>
          </div>
        </div>
      </div>
      <div className="premium-menu-foot"><small>{brand.season} / COLOMBIA / 2026</small><span>STREETWEAR · DENIM · PERFUMERÍA</span></div>
    </aside>
  </>
}
