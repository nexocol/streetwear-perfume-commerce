import { useEffect, useMemo, useRef, useState } from 'react'
import { useCatalog } from '../context/CatalogContext'
import { parseCommercialTerms } from '../lib/clientContent'
import { money } from '../lib/format'
import { expectedShippingCOP, PICKUP_DEPOSIT_COP, SHIPPING_REGIONS, SHIPPING_REGION_LABEL } from '../lib/shippingRegions'
import type { CheckoutContext, PurchaseMethod, ShippingRegion } from '../lib/shippingRegions'

type Step = 'method' | 'region' | 'summary'

export function PreCheckout({open,onClose,productsSubtotal,onConfirm,busy,error}:{
  open:boolean
  onClose:()=>void
  productsSubtotal:number|null
  onConfirm:(context:CheckoutContext)=>void
  busy:boolean
  error:string|null
}){
  const {catalog}=useCatalog()
  const terms=useMemo(()=>parseCommercialTerms(catalog?.site?.shippingCopy),[catalog?.site?.shippingCopy])
  const ref=useRef<HTMLDialogElement>(null)
  const [step,setStep]=useState<Step>('method')
  const [method,setMethod]=useState<PurchaseMethod|null>(null)
  const [region,setRegion]=useState<ShippingRegion|null>(null)

  useEffect(()=>{
    const el=ref.current;if(!el)return
    if(open&&!el.open)el.showModal()
    if(!open&&el.open)el.close()
  },[open])
  useEffect(()=>{if(open){setStep('method');setMethod(null);setRegion(null)}},[open])

  function chooseMethod(m:PurchaseMethod){setMethod(m);setStep(m==='pickup'?'summary':'region')}
  function chooseRegion(r:ShippingRegion){setRegion(r);setStep('summary')}
  function confirm(){if(!method)return;onConfirm({purchaseMethod:method,shippingRegion:method==='pickup'?null:region})}

  const shipping=method?expectedShippingCOP(terms,method,region):null
  const total=shipping!=null&&productsSubtotal!=null?productsSubtotal+shipping:null

  return <dialog ref={ref} id="precheckout-dialog" onClose={onClose} aria-labelledby="precheckout-title">
    <button className="dialog-close" onClick={onClose} aria-label="Cerrar">×</button>

    {step==='method'&&<div className="precheckout-step">
      <span>CHECKOUT</span>
      <h2 id="precheckout-title">¿CÓMO QUIERES COMPRAR?</h2>
      <div className="precheckout-options">
        <button className="precheckout-option" onClick={()=>chooseMethod('prepaid')}><b>PAGO ANTICIPADO</b><p>Paga el pedido antes del despacho.</p></button>
        <button className="precheckout-option" onClick={()=>chooseMethod('cod')}><b>CONTRAENTREGA</b><p>Paga los productos al recibirlos. El envío se paga previamente.</p></button>
        <button className="precheckout-option" onClick={()=>chooseMethod('pickup')}><b>RETIRO EN TIENDA</b><p>Recoge tu pedido sin costo de envío.</p></button>
      </div>
    </div>}

    {step==='region'&&<div className="precheckout-step">
      <span>{method==='prepaid'?'PAGO ANTICIPADO':'CONTRAENTREGA'}</span>
      <h2 id="precheckout-title">¿DÓNDE RECIBES TU PEDIDO?</h2>
      <div className="precheckout-options">
        {SHIPPING_REGIONS.map(r=><button key={r} className="precheckout-option" onClick={()=>chooseRegion(r)}><b>{SHIPPING_REGION_LABEL[r]}</b><p>Envío {money(expectedShippingCOP(terms,method as PurchaseMethod,r))}</p></button>)}
      </div>
      <button className="text-link" onClick={()=>setStep('method')}>← CAMBIAR FORMA DE COMPRA</button>
    </div>}

    {step==='summary'&&method&&<div className="precheckout-step">
      <span>{method==='prepaid'?'PAGO ANTICIPADO':method==='cod'?'CONTRAENTREGA':'RETIRO EN TIENDA'}</span>
      <h2 id="precheckout-title">{method==='pickup'?'RETIRO EN TIENDA · $0 DE ENVÍO':method==='prepaid'?'PAGO ANTICIPADO':'CONTRAENTREGA'}</h2>

      {method==='prepaid'&&<div className="precheckout-copy">
        <p>En Shopify selecciona: <b>ENVÍO — PAGO ANTICIPADO</b></p>
        <p>Envío: <b>{money(terms.prepaidShipping)}</b></p>
        <p>Selecciona también la forma de pago <b>Pago anticipado</b>.</p>
      </div>}
      {method==='cod'&&region&&<div className="precheckout-copy">
        <p>En Shopify selecciona: <b>ENVÍO — CONTRAENTREGA · ENVÍO PREPAGO</b></p>
        <p>Envío ({SHIPPING_REGION_LABEL[region]}): <b>{money(expectedShippingCOP(terms,'cod',region))}</b></p>
        <p>El valor del envío se paga previamente. Los productos se pagan al recibirlos.</p>
        <p>En Shopify selecciona la forma de pago: <b>Pago contra entrega (COD)</b>.</p>
      </div>}
      {method==='pickup'&&<div className="precheckout-copy">
        <p>Para reservar tu pedido se requiere un abono de <b>{money(PICKUP_DEPOSIT_COP)}</b>. Ese valor se descuenta del precio final del producto. EL PUNTO se pondrá en contacto contigo para coordinar la reserva y la entrega.</p>
        <p>En Shopify selecciona <b>Retiro en tienda</b>.</p>
      </div>}

      <div className="precheckout-totals">
        <div><span>PRODUCTOS</span><b>{money(productsSubtotal)}</b></div>
        <div><span>ENVÍO ESTIMADO</span><b>{money(shipping)}</b></div>
        <div className="precheckout-total-final"><span>TOTAL ESTIMADO</span><b>{money(total)}</b></div>
      </div>

      {error&&<p className="cart-checkout-error">{error}</p>}
      <button className="btn dark wide" disabled={busy} onClick={confirm}>{busy?'PROCESANDO…':'CONTINUAR A SHOPIFY'}</button>
      <button className="text-link" onClick={()=>setStep(method==='pickup'?'method':'region')}>← CAMBIAR</button>
    </div>}
  </dialog>
}
