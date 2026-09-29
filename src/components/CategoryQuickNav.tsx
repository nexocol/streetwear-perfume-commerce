import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

export type CategoryQuickLink={value:string;label:string;to:string;count:number}

/** Always-visible category row for /shop: TODOS + every active category. Plain links, so the URL (?cat=) is the single source of truth (back/forward just work). */
export function CategoryQuickNav({links,current,total}:{links:CategoryQuickLink[];current:string;total:number}){
  const ref=useRef<HTMLElement>(null)
  // Keep the selected category visible even if webfont metrics settle after the first paint.
  useLayoutEffect(()=>{
    const nav=ref.current
    const active=nav?.querySelector<HTMLElement>('[aria-current="true"]')
    if(!nav||!active)return

    let cancelled=false
    let raf=0
    const center=()=>{
      if(cancelled)return
      const target=active.offsetLeft-(nav.clientWidth-active.offsetWidth)/2
      const max=Math.max(0,nav.scrollWidth-nav.clientWidth)
      nav.scrollLeft=Math.max(0,Math.min(target,max))
    }
    const settle=()=>{
      cancelAnimationFrame(raf)
      raf=requestAnimationFrame(()=>{center();raf=requestAnimationFrame(center)})
    }

    center();settle()
    document.fonts?.ready.then(()=>{if(!cancelled)settle()})

    const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(settle):null
    ro?.observe(nav);ro?.observe(active)
    addEventListener('resize',settle,{passive:true})

    return()=>{cancelled=true;cancelAnimationFrame(raf);ro?.disconnect();removeEventListener('resize',settle)}
  },[current,links.length])

  const items=[{value:'Todos',label:'Todos',to:'/shop',count:total},...links]
  return <nav className="shop-cats" aria-label="Categorías" ref={ref} data-testid="shop-cats">
    {items.map(item=>{const selected=item.value===current
      return <Link key={item.value} to={item.to} className={selected?'active':''} aria-current={selected?'true':undefined} data-cat={item.value}><span>{item.label}</span><sup>{item.count}</sup></Link>})}
  </nav>
}
