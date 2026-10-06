import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { useUI } from '../context/UIContext'
import { ImageWithFallback } from './ImageWithFallback'
import { ArrowIcon } from './ArrowIcon'
import { displayCategory, displayProductName, displayProductSubtitle, productStyle } from '../lib/clientContent'
import { availableProductsFirst } from '../lib/availability'
import { expandWatchProducts, productLink } from '../lib/watchCatalog'

export function SearchOverlay(){
  const {catalog}=useCatalog(); const ui=useUI(); const navigate=useNavigate(); const [query,setQuery]=useState('')
  const results=useMemo(()=>{
    const q=query.trim().toLowerCase(); if(!q)return []
    const matches=expandWatchProducts((catalog?.products||[]).filter(p=>p.status==='active')).filter(p=>[displayProductName(p),displayCategory(p.category),productStyle(p)||'',displayProductSubtitle(p),...(p.collections||[]).map(c=>c.name)].some(v=>v.toLowerCase().includes(q)))
    return availableProductsFirst(matches,Boolean(catalog?.site?.shopifyEnabled)).slice(0,8)
  },[query,catalog])
  function submit(e:React.FormEvent){e.preventDefault();const q=query.trim();if(!q)return;ui.closeSearch();navigate('/shop?q='+encodeURIComponent(q))}
  return <div className={'search-overlay '+(ui.searchOpen?'open':'')} aria-hidden={!ui.searchOpen}>
    <div className="search-top"><span>BUSCAR PRODUCTOS</span><button onClick={ui.closeSearch} aria-label="Cerrar búsqueda">×</button></div>
    <form onSubmit={submit}><input autoFocus={ui.searchOpen} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Producto, categoría o estilo" aria-label="Buscar productos"/><button>BUSCAR <ArrowIcon direction="right"/></button></form>
    <div className="search-results">
      {query&&!results.length&&<p>Sin resultados para “{query}”.</p>}
      {results.map(p=><Link key={p.listingKey||p.id} to={productLink(p)} onClick={ui.closeSearch}><ImageWithFallback src={p.media[0]?.publicUrl} alt={displayProductName(p)}/><span><b>{displayProductName(p)}</b><small>{displayCategory(p.category)+(productStyle(p)?' / '+productStyle(p):'')}</small></span></Link>)}
    </div>
  </div>
}
