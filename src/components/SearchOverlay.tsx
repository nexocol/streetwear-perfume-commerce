import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { useUI } from '../context/UIContext'
import { ImageWithFallback } from './ImageWithFallback'

export function SearchOverlay(){
  const {catalog}=useCatalog(); const ui=useUI(); const navigate=useNavigate(); const [query,setQuery]=useState('')
  const results=useMemo(()=>{
    const q=query.trim().toLowerCase(); if(!q)return []
    return (catalog?.products||[]).filter(p=>[p.name,p.category,p.fit||'',...(p.collections||[]).map(c=>c.name)].some(v=>v.toLowerCase().includes(q))).slice(0,8)
  },[query,catalog])
  function submit(e:React.FormEvent){e.preventDefault();const q=query.trim();if(!q)return;ui.closeSearch();navigate('/shop?q='+encodeURIComponent(q))}
  return <div className={'search-overlay '+(ui.searchOpen?'open':'')} aria-hidden={!ui.searchOpen}>
    <div className="search-top"><span>BUSCAR PRODUCTOS</span><button onClick={ui.closeSearch} aria-label="Cerrar búsqueda">×</button></div>
    <form onSubmit={submit}><input autoFocus={ui.searchOpen} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre, categoría, fit o colección" aria-label="Buscar productos"/><button>BUSCAR ↗</button></form>
    <div className="search-results">
      {query&&!results.length&&<p>Sin resultados para “{query}”.</p>}
      {results.map(p=><Link key={p.id} to={'/product/'+p.slug} onClick={ui.closeSearch}><ImageWithFallback src={p.media[0]?.publicUrl} alt={p.name}/><span><b>{p.name}</b><small>{p.category+(p.fit?' / '+p.fit:'')}</small></span></Link>)}
    </div>
  </div>
}
