import { useEffect, useRef } from 'react'
import { useCatalog } from '../context/CatalogContext'
import { useUI } from '../context/UIContext'
import { sizeGuide } from '../data/sizeGuide'

export function Dialogs(){
  const {catalog}=useCatalog(); const ui=useUI(); const sizeRef=useRef<HTMLDialogElement>(null); const infoRef=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    const target=ui.info==='size'?sizeRef.current:ui.info?infoRef.current:null
    if(target&&!target.open)target.showModal()
    if(!ui.info){if(sizeRef.current?.open)sizeRef.current.close();if(infoRef.current?.open)infoRef.current.close()}
  },[ui.info])
  const site=catalog?.site
  const info=ui.info&&ui.info!=='size'?{
    changes:{title:'CAMBIOS',text:site?.changesCopy||'La prenda debe regresar sin uso, manchas, daños, modificaciones u olores, con etiquetas y elementos originales.'},
    advice:{title:'ASESORÍA',text:site?.advisoryCopy||'Si estás entre dos tallas, compara las medidas con una prenda propia cuyo fit te guste antes de elegir.'},
    shipping:{title:'ENVÍOS',text:site?.shippingCopy||'La cobertura, el costo y los tiempos de envío se confirmarán según el destino.'}
  }[ui.info]:null
  const whatsapp=site?.whatsapp?.replace(/\D/g,'')
  return <>
    <dialog ref={sizeRef} id="size-dialog" onClose={ui.closeInfo} aria-labelledby="size-title"><button className="dialog-close" onClick={ui.closeInfo}>×</button><span>GUÍA DE TALLAS</span><h2 id="size-title">{sizeGuide.title}</h2><div className="size-table"><div className="size-row head">{sizeGuide.headers.map(x=><b key={x}>{x}</b>)}</div>{sizeGuide.rows.map((r,i)=><div className="size-row" key={i}>{r.map((x,j)=><span key={j}>{x}</span>)}</div>)}</div><p>{sizeGuide.note}</p></dialog>
    <dialog ref={infoRef} id="service-dialog" onClose={ui.closeInfo} aria-labelledby="service-title"><button className="dialog-close" onClick={ui.closeInfo}>×</button><span>AYUDA DE COMPRA</span><h2 id="service-title">{info?.title||'INFORMACIÓN'}</h2><div data-service-content><p>{info?.text}</p>{ui.info==='advice'&&whatsapp&&<a className="btn dark" href={'https://wa.me/'+whatsapp} target="_blank" rel="noreferrer">ESCRIBIR POR WHATSAPP</a>}</div></dialog>
  </>
}
