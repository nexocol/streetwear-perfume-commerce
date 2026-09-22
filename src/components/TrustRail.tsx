import { useUI } from '../context/UIContext'
export function TrustRail(){
  const ui=useUI()
  return <section className="trust-rail" aria-label="Ayuda de compra">
    <button onClick={()=>ui.openInfo('size')}><span>01</span><b>GUÍA DE TALLAS</b><small>Encuentra tu fit</small></button>
    <button onClick={()=>ui.openInfo('changes')}><span>02</span><b>CAMBIOS</b><small>Revisa las condiciones</small></button>
    <button onClick={()=>ui.openInfo('advice')}><span>03</span><b>ASESORÍA</b><small>Si dudas entre tallas</small></button>
    <button onClick={()=>ui.openInfo('shipping')}><span>04</span><b>ENVÍOS</b><small>Consulta cobertura</small></button>
  </section>
}
