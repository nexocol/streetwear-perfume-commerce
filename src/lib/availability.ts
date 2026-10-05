import type { Product } from '../types'
import { canBuy } from './pricing'

export function productIsAvailable(product: Product, shopifyEnabled: boolean) {
  return product.variants.some(variant => canBuy(variant, shopifyEnabled))
}

export function availableProductsFirst(products: Product[], shopifyEnabled: boolean) {
  return products
    .map((product, index) => ({ product, index, available: productIsAvailable(product, shopifyEnabled) }))
    .sort((a, b) => Number(b.available) - Number(a.available) || a.index - b.index)
    .map(({ product }) => product)
}
