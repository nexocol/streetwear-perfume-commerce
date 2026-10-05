import type { Product, Variant } from '../types'
import { isBuyable } from './variants'

// Single source of truth for what price a customer sees, in preview and live (Shopify) mode.
//
// Preview (shopify_enabled=0): unchanged from before — D1 product/variant price.
//
// Live (shopify_enabled=1): Shopify is commercial source of truth. A variant only "has a
// verified price" when it is mapped (shopifyVariantId) AND the catalog overlay actually
// populated variant.price for it. If the overlay failed or hasn't run, mapped variants keep
// their raw D1 price (null, since D1 never stores per-variant prices in this catalog) — we
// treat that as "unverified" and never silently show/sell at the stale D1 placeholder.

export type ProductPriceResult = { amount: number | null; isRange: boolean }

function verifiedVariantPrice(v: Variant, shopifyEnabled: boolean): number | null {
  if (!shopifyEnabled) return v.price
  if (!v.shopifyVariantId) return null
  return v.price
}

export function canBuy(v: Variant, shopifyEnabled: boolean): boolean {
  return isBuyable(v, shopifyEnabled)
}

// Card / listing price: single amount, or the lowest amount among priced buyable variants
// when variants disagree (isRange=true — render as "DESDE $X").
export function productPrice(product: Product, shopifyEnabled: boolean): ProductPriceResult {
  if (!shopifyEnabled) return { amount: product.price, isRange: false }
  const mapped = product.variants.filter(v => v.shopifyVariantId)
  if (mapped.length === 0) return { amount: null, isRange: false }
  const current = mapped.filter(v => v.available || v.price != null)
  if (!current.length || current.some(v => v.price == null)) return { amount: null, isRange: false }
  const buyable = current.filter(v => isBuyable(v, shopifyEnabled))
  const pool = buyable.length ? buyable : current
  const amounts = pool.map(v => v.price as number)
  const min = Math.min(...amounts)
  const max = Math.max(...amounts)
  return { amount: min, isRange: min !== max }
}

// PDP / cart line price for one selected variant. Falls back to product.price only in
// preview mode (matches today's behavior exactly); in live mode an unverified variant
// price is surfaced as null (never the stale D1 placeholder).
export function selectedVariantPrice(variant: Variant | null | undefined, product: Product, shopifyEnabled: boolean): number | null {
  if (!variant) return shopifyEnabled ? null : product.price
  const verified = verifiedVariantPrice(variant, shopifyEnabled)
  if (!shopifyEnabled) return verified ?? product.price
  return verified
}
