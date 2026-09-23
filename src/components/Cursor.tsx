import { useEffect, useRef, useState } from 'react'
export function Cursor(){
  const ref=useRef<HTMLDivElement>(null);const [label,setLabel]=useState('')
  useEffect(()=>{
    const fine=matchMedia('(pointer:fine)').matches;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(!fine||reduced)return
    const move=(e:PointerEvent)=>{if(ref.current)ref.current.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`}
    const over=(e:PointerEvent)=>{const target=(e.target as HTMLElement)?.closest?.('[data-cursor]') as HTMLElement|null;const state=target?.dataset.cursor||'';setLabel(state);ref.current?.classList.toggle('active',Boolean(state))}
    const leave=()=>ref.current?.classList.remove('active')
    addEventListener('pointermove',move);document.addEventListener('pointerover',over);document.documentElement.addEventListener('mouseleave',leave)
    return()=>{removeEventListener('pointermove',move);document.removeEventListener('pointerover',over);document.documentElement.removeEventListener('mouseleave',leave)}
  },[])
  return <div id="cursor" ref={ref} aria-hidden="true"><span>{label}</span></div>
}
