// Shared between the frontend (pre-checkout UI/display) and the Worker (authoritative
// validation + shipping derivation). No DOM/Node/Worker-only APIs — safe to import from both.
import type { CommercialTerms } from './clientContent'

export type PurchaseMethod = 'prepaid' | 'cod' | 'pickup'
export type ShippingRegion = 'bogota' | 'cundinamarca' | 'rest_colombia'

export const SHIPPING_REGIONS: ShippingRegion[] = ['bogota', 'cundinamarca', 'rest_colombia']

export const SHIPPING_REGION_LABEL: Record<ShippingRegion, string> = {
  bogota: 'Bogotá D.C.',
  cundinamarca: 'Cundinamarca',
  rest_colombia: 'Resto de Colombia'
}

// Fixed per V4.6C spec (not part of the editable CommercialTerms schema).
export const PICKUP_DEPOSIT_COP = 10000

// Reads the SAME admin-editable commercial terms (site_settings.shipping_copy, CMS ->
// AdminSettingsPage "COMERCIAL") that the frontend already displays, so the shipping owner
// sees on the storefront and what the Worker charges/attributes on checkout never drift.
export function expectedShippingCOP(terms: CommercialTerms, method: PurchaseMethod, region: ShippingRegion | null): number {
  if (method === 'pickup') return 0
  if (method === 'prepaid') return terms.prepaidShipping
  if (region === 'bogota') return terms.codBogota
  if (region === 'cundinamarca') return terms.codCundinamarca
  return terms.codNational
}

export interface CheckoutContext {
  purchaseMethod: PurchaseMethod
  shippingRegion: ShippingRegion | null
}

export function parseCheckoutContext(value: unknown): CheckoutContext | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const purchaseMethod = v.purchaseMethod
  if (purchaseMethod !== 'prepaid' && purchaseMethod !== 'cod' && purchaseMethod !== 'pickup') return null
  if (purchaseMethod === 'pickup') {
    if (v.shippingRegion != null) return null
    return { purchaseMethod, shippingRegion: null }
  }
  const region = v.shippingRegion
  if (region !== 'bogota' && region !== 'cundinamarca' && region !== 'rest_colombia') return null
  return { purchaseMethod, shippingRegion: region }
}

export function purchaseMethodLabel(method: PurchaseMethod): string {
  return method === 'prepaid' ? 'Pago anticipado' : method === 'cod' ? 'Contraentrega' : 'Retiro en tienda'
}

export function cartAttributesFor(terms: CommercialTerms, ctx: CheckoutContext): { key: string; value: string }[] {
  const shipping = expectedShippingCOP(terms, ctx.purchaseMethod, ctx.shippingRegion)
  const attrs = [
    { key: 'EL_PUNTO_PURCHASE_METHOD', value: purchaseMethodLabel(ctx.purchaseMethod) },
    { key: 'EL_PUNTO_FULFILLMENT', value: ctx.purchaseMethod === 'pickup' ? 'Retiro' : 'Envío' },
    { key: 'EL_PUNTO_EXPECTED_SHIPPING_COP', value: String(shipping) }
  ]
  if (ctx.shippingRegion) attrs.push({ key: 'EL_PUNTO_SHIPPING_REGION', value: SHIPPING_REGION_LABEL[ctx.shippingRegion] })
  return attrs
}
