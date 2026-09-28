import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function MotionController(){
  const location=useLocation()
  useEffect(()=>{
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
    const nodes=[...document.querySelectorAll<HTMLElement>('[data-reveal]')]
    if(reduced)nodes.forEach(el=>el.classList.add('visible'))
    else{
      const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){(entry.target as HTMLElement).classList.add('visible');io.unobserve(entry.target)}}),{threshold:.1,rootMargin:'0px 0px -4% 0px'})
      nodes.forEach(el=>io.observe(el))
      return()=>io.disconnect()
    }
  },[location.pathname,location.search])

  useEffect(()=>{
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
    if(reduced)return
    let raf=0,lastY=scrollY,lastT=performance.now()
    const root=document.documentElement
    const update=()=>{
      raf=0
      const now=performance.now(),y=scrollY,max=Math.max(1,root.scrollHeight-innerHeight)
      const dt=Math.max(16,now-lastT),velocity=Math.max(-2,Math.min(2,(y-lastY)/dt))
      const progress=y/max
      root.style.setProperty('--scroll-progress',String(progress))
      root.style.setProperty('--scroll-y',y+'px')
      root.style.setProperty('--scroll-velocity',String(velocity))
      root.style.setProperty('--ticker-duration',Math.max(20,Math.min(28,24-velocity*2))+'s')
      root.style.setProperty('--motion-x',velocity*18+'px')
      root.style.setProperty('--menu-motion-x',velocity*-10+'px')
      root.style.setProperty('--hero-orb-y',progress*-80+'px')
      root.style.setProperty('--hero-ring-y',progress*-40+'px')
      root.style.setProperty('--hero-line-y',progress*-40+'px')
      root.dataset.scrollDirection=y>=lastY?'down':'up'
      lastY=y;lastT=now
    }
    const onScroll=()=>{if(!raf)raf=requestAnimationFrame(update)}
    update();addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll,{passive:true})
    return()=>{removeEventListener('scroll',onScroll);removeEventListener('resize',onScroll);if(raf)cancelAnimationFrame(raf)}
  },[location.pathname,location.search])

  useEffect(()=>{
    if(matchMedia('(pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const cleanups:Function[]=[]
      document.querySelectorAll<HTMLElement>('[data-depth-section]').forEach(section=>{
        const move=(e:PointerEvent)=>{
          const r=section.getBoundingClientRect();const nx=(e.clientX-r.left)/r.width-.5;const ny=(e.clientY-r.top)/r.height-.5
          section.querySelectorAll<HTMLElement>('[data-depth]').forEach(layer=>{
            const depth=Number(layer.dataset.depth||1)
            layer.style.setProperty('--px',nx*7*depth+'px');layer.style.setProperty('--py',ny*5*depth+'px')
          })
        }
        const leave=()=>section.querySelectorAll<HTMLElement>('[data-depth]').forEach(layer=>{layer.style.setProperty('--px','0px');layer.style.setProperty('--py','0px')})
        section.addEventListener('pointermove',move);section.addEventListener('pointerleave',leave)
        cleanups.push(()=>{section.removeEventListener('pointermove',move);section.removeEventListener('pointerleave',leave)})
      })
      document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach(el=>{
        const move=(e:PointerEvent)=>{const r=el.getBoundingClientRect();el.style.setProperty('--mx',(e.clientX-r.left-r.width/2)*.055+'px');el.style.setProperty('--my',(e.clientY-r.top-r.height/2)*.065+'px')}
        const leave=()=>{el.style.setProperty('--mx','0px');el.style.setProperty('--my','0px')}
        el.addEventListener('pointermove',move);el.addEventListener('pointerleave',leave)
        cleanups.push(()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave)})
      })
      return()=>cleanups.forEach(fn=>fn())
    }
  },[location.pathname,location.search])
  return null
}
