import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
export function MotionController(){
  const location=useLocation()
  useEffect(()=>{
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
    const nodes=[...document.querySelectorAll<HTMLElement>('[data-reveal]')]
    if(reduced)nodes.forEach(el=>el.classList.add('visible'))
    else{
      const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){(entry.target as HTMLElement).classList.add('visible');io.unobserve(entry.target)}}),{threshold:.1})
      nodes.forEach(el=>io.observe(el))
      return()=>io.disconnect()
    }
  },[location.pathname,location.search])
  useEffect(()=>{
    if(matchMedia('(pointer:fine)').matches&& !matchMedia('(prefers-reduced-motion: reduce)').matches){
      const cleanups:Function[]=[]
      document.querySelectorAll<HTMLElement>('[data-depth-section]').forEach(section=>{
        const move=(e:PointerEvent)=>{const r=section.getBoundingClientRect();const nx=(e.clientX-r.left)/r.width-.5;const ny=(e.clientY-r.top)/r.height-.5;section.querySelectorAll<HTMLElement>('[data-depth]').forEach(layer=>{const depth=Number(layer.dataset.depth||1);layer.style.setProperty('--px',nx*4*depth+'px');layer.style.setProperty('--py',ny*3*depth+'px')})}
        const leave=()=>section.querySelectorAll<HTMLElement>('[data-depth]').forEach(layer=>{layer.style.setProperty('--px','0px');layer.style.setProperty('--py','0px')})
        section.addEventListener('pointermove',move);section.addEventListener('pointerleave',leave);cleanups.push(()=>{section.removeEventListener('pointermove',move);section.removeEventListener('pointerleave',leave)})
      })
      document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach(el=>{
        const move=(e:PointerEvent)=>{const r=el.getBoundingClientRect();el.style.setProperty('--mx',(e.clientX-r.left-r.width/2)*.04+'px');el.style.setProperty('--my',(e.clientY-r.top-r.height/2)*.05+'px')}
        const leave=()=>{el.style.setProperty('--mx','0px');el.style.setProperty('--my','0px')}
        el.addEventListener('pointermove',move);el.addEventListener('pointerleave',leave);cleanups.push(()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave)})
      })
      return()=>cleanups.forEach(fn=>fn())
    }
  },[location.pathname,location.search])
  return null
}
