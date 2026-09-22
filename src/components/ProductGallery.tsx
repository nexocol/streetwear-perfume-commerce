import { useRef, useState } from 'react'
import type { ProductMedia } from '../types'
import { ImageWithFallback } from './ImageWithFallback'
import { pad } from '../lib/format'
export function ProductGallery({media,name}:{media:ProductMedia[];name:string}){
  const ref=useRef<HTMLElement>(null);const [current,setCurrent]=useState(0)
  function update(){
    const el=ref.current;if(!el)return
    const slides=[...el.querySelectorAll<HTMLElement>('[data-gallery-slide]')];const center=el.scrollLeft+el.clientWidth/2
    let best=0,dist=Infinity;slides.forEach((s,i)=>{const d=Math.abs(s.offsetLeft+s.offsetWidth/2-center);if(d<dist){dist=d;best=i}});setCurrent(best)
  }
  return <section className="gallery" ref={ref} onScroll={update} data-gallery data-cursor="DRAG">
    {media.length?media.map((m,i)=><figure key={m.id} className={i===0?'hero-shot':''} data-gallery-slide={i}><ImageWithFallback src={m.publicUrl} alt={m.alt||name} fetchPriority={i===0?'high':undefined} loading={i===0?'eager':'lazy'} decoding="async"/></figure>):<figure className="hero-shot"><div className="image-fallback"><span>Imagen próximamente</span></div></figure>}
    <div className="gallery-indicator"><span>{pad(current+1)}</span> / {pad(Math.max(media.length,1))}</div>
  </section>
}
