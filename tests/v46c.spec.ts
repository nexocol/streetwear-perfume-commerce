import { test, expect, type Page, type Route } from '@playwright/test'
import { seedCatalog } from '../src/data/seed'
import type { CatalogSnapshot, Product } from '../src/types'

async function mockApi(page: Page, catalog: CatalogSnapshot, opts: { checkoutBody?: any[] } = {}) {
  await page.route('**/api/**', async route => {
    const req = route.request(); const path = new URL(req.url()).pathname
    if (path === '/api/catalog' || path === '/api/admin/catalog') return route.fulfill({ json: catalog })
    if (path === '/api/shopify/checkout' && req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}')
      opts.checkoutBody?.push(body)
      return route.fulfill({ json: { checkoutUrl: '/precheckout-mock-success', cartId: 'gid://shopify/Cart/mock' } })
    }
    return route.continue()
  })
  await page.route(/googleusercontent\.com/, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="12"/>' }))
}

function withShopify(overrides: Partial<Product['variants'][number]>[], productOverrides: Partial<Product> = {}, shopifyEnabled = true): CatalogSnapshot {
  const c = structuredClone(seedCatalog)
  c.site.shopifyEnabled = shopifyEnabled
  const tee = c.products.find(p => p.id === 'tee-01')!
  tee.price = 999999 // D1 placeholder — must NEVER be what the UI shows once Shopify is enabled
  tee.shopifyProductId = 'gid://shopify/Product/1'
  tee.shopifyHandle = tee.slug
  Object.assign(tee, productOverrides)
  tee.variants = tee.variants.map((v, i) => ({ ...v, shopifyVariantId: 'gid://shopify/ProductVariant/'+(i+1), stock: 10, available: true, ...overrides[i] }))
  return c
}
const teeSlug = seedCatalog.products.find(p => p.id === 'tee-01')!.slug

test.describe('V4.6C preview-mode regression (shopify_enabled=0)', () => {
  test('card + PDP show D1 price, checkout stays PRÓXIMAMENTE, no pre-checkout', async ({ page }) => {
    const catalog = structuredClone(seedCatalog)
    const tee = catalog.products.find(p => p.id === 'tee-01')!
    tee.price = 100000
    await mockApi(page, catalog)
    await page.goto('/shop')
    const card = page.locator('.card', { hasText: 'Camiseta Gráfica' }).first()
    await expect(card.locator('.meta b')).toHaveText('$ 100.000')
    await page.goto('/product/' + teeSlug)
    await expect(page.locator('.pdp-info .price')).toHaveText('$ 100.000')
    await page.locator('.sizes button').first().click()
    await page.locator('.add-button').click()
    await page.locator('.cart footer button').first().waitFor()
    await expect(page.locator('.cart footer button').first()).toHaveText('CHECKOUT — PRÓXIMAMENTE')
    await expect(page.locator('#precheckout-dialog')).not.toBeVisible()
  })
})

test.describe('V4.6C Shopify is price source of truth (shopify_enabled=1)', () => {
  test('single shared overlay price: card + PDP show it, NOT the D1 placeholder', async ({ page }) => {
    const catalog = withShopify([{ price: 55000 }, { price: 55000 }, { price: 55000 }, { price: 55000 }])
    await mockApi(page, catalog)
    await page.goto('/shop')
    const card = page.locator('.card', { hasText: 'Camiseta Gráfica' }).first()
    await expect(card.locator('.meta b')).toHaveText('$ 55.000')
    await expect(card.locator('.meta b')).not.toContainText('999.999')
    await page.goto('/product/' + teeSlug)
    await page.locator('.sizes button').first().click()
    await expect(page.locator('.pdp-info .price')).toHaveText('$ 55.000')
  })

  test('mixed variant prices show DESDE the lowest', async ({ page }) => {
    const catalog = withShopify([{ price: 40000 }, { price: 60000 }, { price: 60000 }, { price: 60000 }])
    await mockApi(page, catalog)
    await page.goto('/shop')
    const card = page.locator('.card', { hasText: 'Camiseta Gráfica' }).first()
    await expect(card.locator('.meta b')).toHaveText('DESDE $ 40.000')
  })

  test('overlay could not verify a mapped variant price: never falls back to stale D1 price, blocks purchase', async ({ page }) => {
    const catalog = withShopify([{ price: null }, { price: null }, { price: null }, { price: null }])
    await mockApi(page, catalog)
    await page.goto('/shop')
    const card = page.locator('.card', { hasText: 'Camiseta Gráfica' }).first()
    await expect(card.locator('.meta b')).toHaveText('—')
    await expect(card.locator('.meta b')).not.toContainText('999.999')
    await expect(card.locator('.card-actions button')).toHaveText('AGOTADO')
    await page.goto('/product/' + teeSlug)
    await expect(page.locator('.pdp-info .price')).toHaveText('PRECIO POR CONFIRMAR')
    await expect(page.locator('.sizes button').first()).toBeDisabled()
  })

  test('admin: price/stock/availability read-only and labeled "Gestionado en Shopify"', async ({ page }) => {
    const catalog = withShopify([{ price: 55000 }, { price: 55000 }, { price: 55000 }, { price: 55000 }])
    await page.route('**/api/**', async route => {
      const req = route.request(); const path = new URL(req.url()).pathname
      if (path === '/api/admin/catalog') return route.fulfill({ json: catalog })
      if (path === '/api/admin/session') return route.fulfill({ json: { email: 'qa@nexo.local' } })
      return route.continue()
    })
    await page.route(/googleusercontent\.com/, r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="12"/>' }))
    await page.goto('/admin/products/tee-01')
    await expect(page.getByText('Gestionado en Shopify').first()).toBeVisible()
    const priceInput = page.locator('label', { hasText: 'Precio' }).first().locator('input')
    await expect(priceInput).toBeDisabled()
  })
})

test.describe('V4.6C pre-checkout', () => {
  async function addTeeToCart(page: Page) {
    await page.goto('/product/' + teeSlug)
    await page.locator('.sizes button').first().click()
    await page.locator('.add-button').click()
  }

  test('PREPAID shows 10.000 shipping guidance', async ({ page }) => {
    const catalog = withShopify([{ price: 55000 }, { price: 55000 }, { price: 55000 }, { price: 55000 }])
    await mockApi(page, catalog)
    await addTeeToCart(page)
    await page.locator('.cart footer button', { hasText: 'FINALIZAR COMPRA' }).click()
    await expect(page.locator('#precheckout-title')).toHaveText('¿CÓMO QUIERES COMPRAR?')
    await page.locator('.precheckout-option', { hasText: 'PAGO ANTICIPADO' }).click()
    await expect(page.locator('#precheckout-title')).toHaveText('¿DÓNDE RECIBES TU PEDIDO?')
    await page.locator('.precheckout-option', { hasText: 'Bogotá' }).click()
    await expect(page.locator('.precheckout-totals')).toContainText('$ 10.000')
  })

  test('COD + Cundinamarca shows 22.000', async ({ page }) => {
    const catalog = withShopify([{ price: 55000 }, { price: 55000 }, { price: 55000 }, { price: 55000 }])
    await mockApi(page, catalog)
    await addTeeToCart(page)
    await page.locator('.cart footer button', { hasText: 'FINALIZAR COMPRA' }).click()
    await page.locator('.precheckout-option', { hasText: 'CONTRAENTREGA' }).click()
    await page.locator('.precheckout-option', { hasText: 'Cundinamarca' }).click()
    await expect(page.locator('.precheckout-totals')).toContainText('$ 22.000')
  })

  test('PICKUP shows $0 shipping and the 10.000 deposit notice', async ({ page }) => {
    const catalog = withShopify([{ price: 55000 }, { price: 55000 }, { price: 55000 }, { price: 55000 }])
    await mockApi(page, catalog)
    await addTeeToCart(page)
    await page.locator('.cart footer button', { hasText: 'FINALIZAR COMPRA' }).click()
    await page.locator('.precheckout-option', { hasText: 'RETIRO EN TIENDA' }).click()
    await expect(page.locator('.precheckout-totals')).toContainText('ENVÍO ESTIMADO')
    await expect(page.locator('.precheckout-totals')).toContainText('$ 0')
    await expect(page.locator('.precheckout-copy')).toContainText('$ 10.000')
  })

  test('CONTINUAR A SHOPIFY sends only local ids + purchase context, never a Shopify id or amount, and redirects', async ({ page }) => {
    const catalog = withShopify([{ price: 55000 }, { price: 55000 }, { price: 55000 }, { price: 55000 }])
    const bodies: any[] = []
    await mockApi(page, catalog, { checkoutBody: bodies })
    await addTeeToCart(page)
    await page.locator('.cart footer button', { hasText: 'FINALIZAR COMPRA' }).click()
    await page.locator('.precheckout-option', { hasText: 'CONTRAENTREGA' }).click()
    await page.locator('.precheckout-option', { hasText: 'Bogotá' }).click()
    await page.locator('button', { hasText: 'CONTINUAR A SHOPIFY' }).click()
    await page.waitForURL('**/precheckout-mock-success')
    expect(bodies).toHaveLength(1)
    expect(bodies[0].checkoutContext).toEqual({ purchaseMethod: 'cod', shippingRegion: 'bogota' })
    expect(bodies[0].lines[0]).not.toHaveProperty('shopifyVariantId')
    expect(bodies[0].lines[0]).not.toHaveProperty('price')
    expect(typeof bodies[0].lines[0].variantId).toBe('string')
    expect(bodies[0].lines[0].variantId.startsWith('gid://')).toBe(false)
  })

  for (const width of [1440, 1024, 768, 430, 390]) test(`no horizontal overflow at ${width} with pre-checkout open`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 1024 ? 1000 : 900 })
    const catalog = withShopify([{ price: 55000 }, { price: 55000 }, { price: 55000 }, { price: 55000 }])
    await mockApi(page, catalog)
    await addTeeToCart(page)
    await page.locator('.cart footer button', { hasText: 'FINALIZAR COMPRA' }).click()
    await page.locator('.precheckout-option', { hasText: 'CONTRAENTREGA' }).click()
    await page.locator('.precheckout-option', { hasText: 'Bogotá' }).click()
    await expect(page.locator('.precheckout-totals')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
  })
})
