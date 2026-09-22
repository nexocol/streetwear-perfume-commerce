import { useEffect, useRef, useState } from 'react'
export function Cursor(){
  const ref=useRef<HTMLDivElement>(null);const [label,setLabel]=useState('ABRIR')
  useEffect(()=>{
    const fine=matchMedia('(pointer:fine)').matches;if(!fine)return
    const move=(e:PointerEvent)=>{if(ref.current)ref.current.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`}
    const over=(e:PointerEvent)=>{const target=(e.target as HTMLElement)?.closest?.('[data-cursor],a,button') as HTMLElement|null;const state=target?.dataset.cursor||(target?'ABRIR':'');setLabel(state);ref.current?.classList.toggle('active',Boolean(target))}
    const out=(e:PointerEvent)=>{if(!e.relatedTarget)ref.current?.classList.remove('active')}
    addEventListener('pointermove',move);document.addEventListener('pointerover',over);document.addEventListener('pointerout',out)
    return()=>{removeEventListener('pointermove',move);document.removeEventListener('pointerover',over);document.removeEventListener('pointerout',out)}
  },[])
  return <div id="cursor" ref={ref} aria-hidden="true"><span>{label}</span></div>
}
