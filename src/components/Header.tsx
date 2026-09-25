import { useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { useCommerce } from '../commerce/CommerceProvider'
import { useUI } from '../context/UIContext'
import { BrandMark, BRAND_FALLBACK_NAME } from './BrandMark'

function SearchIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2"/></svg>}
function BagIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 8.5h13l1.2 11H4.3l1.2-11Z"/><path d="M8.6 9V6.7a3.4 3.4 0 0 1 6.8 0V9"/></svg>}

export function Header(){
  const {catalog}=useCatalog(); const commerce=useCommerce(); const ui=useUI(); const location=useLocation()
  const brand=useMemo(()=>({name:catalog?.site.brandName||BRAND_FALLBACK_NAME,logo:catalog?.site.logoUrl,season:'DROP / 001'}),[catalog])
  const count=commerce.lines.reduce((n,l)=>n+l.quantity,0)
  useEffect(()=>{ui.closeMenu();ui.closeSearch()},[location.pathname,location.search])
  useEffect(()=>{
    const sync=()=>{
      const header=document.querySelector('[data-header]') as HTMLElement|null
      if(!header)return
      const sample=document.elementsFromPoint(innerWidth/2,Math.min(header.offsetHeight+8,innerHeight-1)).find(el=>!(el as HTMLElement).closest?.('[data-header]')) as HTMLElement|undefined
      const dark=Boolean(sample?.closest?.('.fragrance,.footer,.mobile-menu,.search-overlay'))
      header.classList.toggle('inverse',dark); header.classList.toggle('scrolled',scrollY>16)
    }
    sync(); addEventListener('scroll',sync,{passive:true}); addEventListener('resize',sync,{passive:true})
    return()=>{removeEventListener('scroll',sync);removeEventListener('resize',sync)}
  },[location.pathname])
  return <>
    <header className="nav" data-header>
      <button className="nav-menu" onClick={ui.openMenu} aria-label="Abrir menú">MENÚ</button>
      <Link to="/" className="brand" data-cursor="ABRIR">
        <BrandMark name={brand.name} logo={brand.logo}/><span>{brand.season}</span>
      </Link>
      <nav aria-label="Principal">
        <Link to="/shop" data-cursor="TIENDA">TIENDA</Link>
        <Link to="/#fragrance" data-cursor="ABRIR">FRAGRANCE</Link>
        <Link to="/#editorial" data-cursor="ABRIR">EDITORIAL</Link>
      </nav>
      <div className="nav-actions">
        <button className="nav-icon" onClick={ui.openSearch} data-cursor="BUSCAR" aria-label="Buscar"><SearchIcon/><span className="sr-only">Buscar</span></button>
        <button className="nav-icon bag-action" onClick={ui.openCart} data-cursor="ABRIR" aria-label={'Abrir carrito, '+count+' productos'}><BagIcon/><span className="bag-count">{count}</span><span className="sr-only">Carrito</span></button>
      </div>
    </header>
    <aside className={'mobile-menu '+(ui.menuOpen?'open':'')} aria-hidden={!ui.menuOpen}>
      <div className="mobile-menu-top"><span className="menu-brand"><BrandMark name={brand.name} logo={brand.logo}/></span><button onClick={ui.closeMenu} aria-label="Cerrar menú">×</button></div>
      <nav><Link to="/shop">TIENDA</Link><Link to="/#fragrance">FRAGRANCE</Link><Link to="/#editorial">EDITORIAL</Link><button onClick={ui.openSearch}>BUSCAR</button></nav>
      <small>{brand.season} / 2026</small>
    </aside>
  </>
}
