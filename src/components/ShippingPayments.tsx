import { useCatalog } from '../context/CatalogContext'
import { formatCop, parseCommercialTerms } from '../lib/clientContent'

export function ShippingPayments({compact=false}:{compact?:boolean}){
  const {catalog}=useCatalog()
  const terms=parseCommercialTerms(catalog?.site.shippingCopy)
  return <div className={'commercial-terms '+(compact?'compact':'')}>
    <article><span>01</span><div><h3>PAGO CONTRA ENTREGA</h3><p>{terms.codMessage}</p><dl><div><dt>Bogotá</dt><dd>{formatCop(terms.codBogota)}</dd></div><div><dt>Cundinamarca</dt><dd>{formatCop(terms.codCundinamarca)}</dd></div><div><dt>Resto del país</dt><dd>{formatCop(terms.codNational)}</dd></div></dl></div></article>
    <article><span>02</span><div><h3>PAGO ANTICIPADO</h3><p>{terms.prepaidMessage}</p><dl><div><dt>Envío</dt><dd>{formatCop(terms.prepaidShipping)}</dd></div></dl></div></article>
    <article><span>03</span><div><h3>RECOGER EN BODEGA</h3><p>{terms.pickupMessage}</p><dl><div><dt>Costo de envío</dt><dd>$0</dd></div></dl></div></article>
  </div>
}
