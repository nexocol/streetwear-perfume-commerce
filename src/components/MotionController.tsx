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

  useEffect(()=>{
    let cancelled=false
    let cleanup=()=>{}
    void (async()=>{
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
      if(reduced){
        document.documentElement.dataset.gsapMotion='reduced'
        return
      }
      const [{gsap},{ScrollTrigger}]=await Promise.all([import('gsap'),import('gsap/ScrollTrigger')])
      if(cancelled)return
      gsap.registerPlugin(ScrollTrigger)
      const scope=document.querySelector('.storefront-root')||document.body
      const ctx=gsap.context(()=>{
        const mm=gsap.matchMedia()
        mm.add('(prefers-reduced-motion: no-preference)',()=>{
          if(document.querySelector('.premium-hero')){
            const hero=gsap.timeline({defaults:{ease:'power4.out'}})
            hero
              .fromTo('.premium-hero .hero-main-frame',{clipPath:'inset(0 0 100% 0)',scale:1.045},{clipPath:'inset(0 0 0% 0)',scale:1,duration:1.15},0)
              .from('.premium-hero .hero-secondary',{autoAlpha:0,y:34,rotate:5,scale:.96,duration:.9},.18)
              .from('.premium-hero .eyebrow',{autoAlpha:0,y:14,duration:.55},.2)
              .from('.premium-hero .hero-category-jump',{autoAlpha:0,y:18,duration:.62},.26)
              .from('.premium-hero .hero-title-line',{autoAlpha:0,yPercent:60,stagger:.075,duration:.8},.3)
              .from('.premium-hero .hero-bottom',{autoAlpha:0,y:24,duration:.68},.5)
          }

          gsap.utils.toArray<HTMLElement>('.featured-section .card').forEach((card,index)=>{
            gsap.from(card,{
              autoAlpha:0,
              y:54+(index%2)*18,
              rotate:index%2?1.2:-.7,
              duration:.9,
              ease:'power3.out',
              scrollTrigger:{trigger:card,start:'top 88%',once:true}
            })
          })

          const collectionLinks=gsap.utils.toArray<HTMLElement>('.premium-collection-links a')
          if(collectionLinks.length){
            gsap.from(collectionLinks,{
              autoAlpha:0,
              x:28,
              stagger:.07,
              duration:.7,
              ease:'power3.out',
              scrollTrigger:{trigger:'.collections',start:'top 72%',once:true}
            })
          }

          if(document.querySelector('.premium-category-stage img')){
            gsap.fromTo('.premium-category-stage img',{scale:1.08,yPercent:4},{scale:1,yPercent:-3,ease:'none',scrollTrigger:{trigger:'.collections',start:'top bottom',end:'bottom top',scrub:.7}})
          }

          if(document.querySelector('.fragrance-visual img')){
            gsap.fromTo('.fragrance-visual img',{scale:1.06,yPercent:-2},{scale:1.12,yPercent:5,ease:'none',scrollTrigger:{trigger:'.fragrance',start:'top bottom',end:'bottom top',scrub:.8}})
          }

          if(document.querySelector('.fragrance-object')){
            gsap.fromTo('.fragrance-object',{y:26,rotate:3},{y:-18,rotate:-.7,ease:'none',scrollTrigger:{trigger:'.fragrance',start:'top 82%',end:'bottom 12%',scrub:.85}})
          }

          if(document.querySelector('.editorial-image')){
            gsap.fromTo('.editorial-image',{y:42},{y:-28,ease:'none',scrollTrigger:{trigger:'.editorial',start:'top bottom',end:'bottom top',scrub:.75}})
          }

          gsap.utils.toArray<HTMLElement>('.section-heading h2,.collections-heading h2,.fragrance-copy h2,.editorial-copy h2').forEach(el=>{
            gsap.from(el,{autoAlpha:0,y:34,duration:.78,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%',once:true}})
          })

          ScrollTrigger.refresh()
          return()=>mm.revert()
        })
      },scope)
      document.documentElement.dataset.gsapMotion='ready'
      cleanup=()=>{ctx.revert();ScrollTrigger.getAll().forEach(t=>t.kill());delete document.documentElement.dataset.gsapMotion}
    })()
    return()=>{cancelled=true;cleanup()}
  },[location.pathname,location.search])

  return null
}
