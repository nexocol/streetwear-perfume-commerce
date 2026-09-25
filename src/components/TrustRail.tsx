import { useUI } from '../context/UIContext'
const items=[
  ['size','01','GUÍA DE TALLAS','Encuentra tu talla'],
  ['changes','02','CAMBIOS','Revisa las condiciones'],
  ['advice','03','ASESORÍA','Resuelve dudas de compra'],
  ['shipping','04','ENVÍOS Y PAGOS','Contra entrega / anticipado'],
] as const

/** `hideSize` drops the size-guide card (perfumes have no sizes); the remaining cards are renumbered. */
export function TrustRail({hideSize=false}:{hideSize?:boolean}){
  const ui=useUI()
  const shown=hideSize?items.filter(([key])=>key!=='size'):items
  return <section className={'trust-rail'+(hideSize?' trust-rail--3':'')} aria-label="Ayuda de compra">
    {shown.map(([key,,title,copy],i)=>{const index=String(i+1).padStart(2,'0');return<button key={key} onClick={()=>ui.openInfo(key)} aria-label={title+' — '+copy}>
      <span className="trust-index">{index}</span><b>{title}</b><small>{copy}</small>
      <span className="trust-view" aria-hidden="true">VER</span><span className="trust-arrow" aria-hidden="true">↗</span>
    </button>})}
  </section>
}
