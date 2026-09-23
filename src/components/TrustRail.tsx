import { useUI } from '../context/UIContext'
const items=[
  ['size','01','GUÍA DE TALLAS','Encuentra tu fit'],
  ['changes','02','CAMBIOS','Revisa las condiciones'],
  ['advice','03','ASESORÍA','Si dudas entre tallas'],
  ['shipping','04','ENVÍOS','Consulta cobertura'],
] as const

export function TrustRail(){
  const ui=useUI()
  return <section className="trust-rail" aria-label="Ayuda de compra">
    {items.map(([key,index,title,copy])=><button key={key} onClick={()=>ui.openInfo(key)} aria-label={title+' — '+copy}>
      <span className="trust-index">{index}</span><b>{title}</b><small>{copy}</small>
      <span className="trust-view" aria-hidden="true">VER</span><span className="trust-arrow" aria-hidden="true">↗</span>
    </button>)}
  </section>
}
