import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

export type CategoryQuickLink={value:string;label:string;to:string;count:number}

/** Always-visible category row for /shop: TODOS + every active category. Plain links, so the URL (?cat=) is the single source of truth (back/forward just work). */
export function CategoryQuickNav({links,current,total}:{links:CategoryQuickLink[];current:string;total:number}){
  const ref=useRef<HTMLElement>(null)
  // On phones the row scrolls sideways: keep the selected category inside the visible part.
  useEffect(()=>{
    const nav=ref.current;const active=nav?.querySelector<HTMLElement>('[aria-current="true"]')
    if(!nav||!active)return
    nav.scrollTo({left:Math.max(0,active.offsetLeft-(nav.clientWidth-active.offsetWidth)/2),behavior:'auto'})
  },[current])
  const items=[{value:'Todos',label:'Todos',to:'/shop',count:total},...links]
  return <nav className="shop-cats" aria-label="Categorías" ref={ref} data-testid="shop-cats">
    {items.map(item=>{const selected=item.value===current
      return <Link key={item.value} to={item.to} className={selected?'active':''} aria-current={selected?'true':undefined} data-cat={item.value}><span>{item.label}</span><sup>{item.count}</sup></Link>})}
  </nav>
}
