import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { ProductGrid } from '../components/ProductGrid'
import { FilterPanel } from '../components/FilterPanel'
import { CategoryQuickNav } from '../components/CategoryQuickNav'
import { TrustRail } from '../components/TrustRail'
import { activeCatalogCategories, categoryShopLinks, displayCategory, displayProductDescription, displayProductName, productStyle } from '../lib/clientContent'

export function ShopPage(){
  const {catalog}=useCatalog();const [params,setParams]=useSearchParams();const [filtersOpen,setFiltersOpen]=useState(false)
  if(!catalog)return null
  const filters={cat:params.get('cat')||'Todos',size:params.get('size')||'',fit:params.get('fit')||'',sort:params.get('sort')||'featured'}
  const q=(params.get('q')||'').trim().toLowerCase()
  const visibleProducts=catalog.products.filter(p=>p.status==='active')
  const activeCategories=activeCatalogCategories(catalog)
  const categoryLinks=categoryShopLinks(catalog)
  const sizes=[...new Set(visibleProducts.flatMap(p=>p.variants.map(v=>v.size)).filter(s=>s!=='Única'))]
  const styles=[...new Set(visibleProducts.flatMap(p=>[productStyle(p),p.fit]).filter(Boolean) as string[])]
  let list=[...visibleProducts]
  if(filters.cat!=='Todos')list=list.filter(p=>p.category===filters.cat)
  if(filters.size)list=list.filter(p=>p.variants.some(v=>v.size===filters.size))
  if(filters.fit)list=list.filter(p=>productStyle(p)===filters.fit||p.fit===filters.fit)
  if(q)list=list.filter(p=>[displayProductName(p),displayCategory(p.category),productStyle(p)||'',displayProductDescription(p),...(p.collections||[]).map(c=>c.name)].some(v=>v.toLowerCase().includes(q)))
  if(filters.sort==='name')list.sort((a,b)=>displayProductName(a).localeCompare(displayProductName(b)))
  else if(filters.sort==='new')list.sort((a,b)=>Number(b.newArrival)-Number(a.newArrival)||a.sortOrder-b.sortOrder)
  else list.sort((a,b)=>Number(b.featured)-Number(a.featured)||a.sortOrder-b.sortOrder)
  const active=[filters.cat!=='Todos',filters.size,filters.fit,filters.sort!=='featured',q].filter(Boolean).length
  function change(key:'cat'|'size'|'fit'|'sort',value:string){const next=new URLSearchParams(params);if((key==='cat'&&value==='Todos')||!value)next.delete(key);else next.set(key,value);setParams(next,{replace:true})}
  function clear(){setParams({}, {replace:true})}
  return <main id="main"><section className="shop-hero"><span>TIENDA / CATÁLOGO</span><h1><span className="hero-line"><span>TODOS LOS</span></span><br/><span className="hero-line"><span>PRODUCTOS</span></span></h1><p>{list.length} PRODUCTOS{q?' / “'+params.get('q')+'”':''}</p></section>
    <CategoryQuickNav links={categoryLinks} current={filters.cat} total={visibleProducts.length}/>
    <div className="shop-toolbar"><button className="filter-trigger" onClick={()=>setFiltersOpen(true)} aria-expanded={filtersOpen}><span>FILTRAR / ORDENAR</span><b>{active?'('+active+')':'+'}</b></button><span>{filters.cat==='Todos'?'TODAS LAS CATEGORÍAS':displayCategory(filters.cat).toUpperCase()}</span></div>
    <FilterPanel open={filtersOpen} filters={filters} categories={activeCategories} sizes={sizes} styles={styles} count={list.length} onChange={change} onClear={clear} onClose={()=>setFiltersOpen(false)}/>
    <section className="catalog"><ProductGrid products={list} className="catalog-grid"/></section><TrustRail/></main>
}
