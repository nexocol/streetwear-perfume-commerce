// Server-side Shopify Storefront API client. Never imported from frontend code —
// the private token must only ever live as a Worker secret (SHOPIFY_STOREFRONT_PRIVATE_TOKEN).
export type ShopifyEnv = {
  SHOPIFY_STORE_DOMAIN?: string
  SHOPIFY_STOREFRONT_API_VERSION?: string
  SHOPIFY_STOREFRONT_PRIVATE_TOKEN?: string
  // Test-only escape hatch: when set, requests go here instead of https://<domain>/api/<version>/graphql.json
  // so tests can point the client at a local mock server. Never set this in wrangler vars/secrets.
  SHOPIFY_GRAPHQL_ENDPOINT?: string
}

export class ShopifyUserError extends Error {
  userErrors: { field: string[] | null; message: string }[]
  constructor(userErrors: { field: string[] | null; message: string }[]) {
    super(userErrors.map(e => e.message).join('; ') || 'Shopify user error')
    this.userErrors = userErrors
  }
}

export function shopifyConfigured(env: ShopifyEnv) {
  const hasEndpoint = Boolean(env.SHOPIFY_GRAPHQL_ENDPOINT || (env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_STOREFRONT_API_VERSION))
  return hasEndpoint && Boolean(env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN)
}

function endpoint(env: ShopifyEnv) {
  if (env.SHOPIFY_GRAPHQL_ENDPOINT) return env.SHOPIFY_GRAPHQL_ENDPOINT
  if (!env.SHOPIFY_STORE_DOMAIN || !env.SHOPIFY_STOREFRONT_API_VERSION) {
    throw new Error('Shopify no configurado: falta SHOPIFY_STORE_DOMAIN o SHOPIFY_STOREFRONT_API_VERSION')
  }
  return `https://${env.SHOPIFY_STORE_DOMAIN}/api/${env.SHOPIFY_STOREFRONT_API_VERSION}/graphql.json`
}

export async function shopifyGraphQL<T = any>(
  env: ShopifyEnv,
  query: string,
  variables: Record<string, unknown> = {},
  opts: { buyerIp?: string | null; timeoutMs?: number } = {}
): Promise<T> {
  const token = env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN
  if (!token) throw new Error('Shopify no configurado: falta SHOPIFY_STOREFRONT_PRIVATE_TOKEN')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Shopify-Storefront-Private-Token': token
  }
  if (opts.buyerIp) headers['Shopify-Storefront-Buyer-IP'] = opts.buyerIp

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000)
  let res: Response
  try {
    res = await fetch(endpoint(env), {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      signal: controller.signal
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Shopify request timed out')
    throw new Error('Shopify request failed: ' + (error instanceof Error ? error.message : String(error)))
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw new Error(`Shopify HTTP ${res.status}`)
  const body = await res.json() as { data?: T; errors?: { message: string }[] }
  if (body.errors?.length) throw new Error('Shopify GraphQL error: ' + body.errors.map(e => e.message).join('; '))
  if (body.data === undefined) throw new Error('Shopify GraphQL response missing data')
  return body.data
}

export async function shopifyHealth(env: ShopifyEnv) {
  const data = await shopifyGraphQL<{ shop: { name: string; currencyCode: string } }>(
    env,
    `query Health { shop { name primaryDomain { url } currencyCode } }`
  )
  return { shopName: data.shop.name, currency: data.shop.currencyCode }
}

export function toVariantGid(shopifyVariantId: string) {
  return shopifyVariantId.startsWith('gid://') ? shopifyVariantId : `gid://shopify/ProductVariant/${shopifyVariantId}`
}

export async function shopifyCartCreate(
  env: ShopifyEnv,
  lines: { merchandiseId: string; quantity: number }[],
  buyerIp?: string | null
) {
  const data = await shopifyGraphQL<{
    cartCreate: {
      cart: { id: string; checkoutUrl: string } | null
      userErrors: { field: string[] | null; message: string }[]
    }
  }>(
    env,
    `mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }`,
    { input: { lines } },
    { buyerIp }
  )
  const { cart, userErrors } = data.cartCreate
  if (userErrors.length) throw new ShopifyUserError(userErrors)
  if (!cart) throw new Error('Shopify no devolvió un cart')
  return { cartId: cart.id, checkoutUrl: cart.checkoutUrl }
}

export interface ShopifyOverlayVariant {
  id: string
  availableForSale: boolean
  quantityAvailable: number | null
  price: number
  compareAtPrice: number | null
}
export interface ShopifyOverlayProduct {
  id: string
  variants: ShopifyOverlayVariant[]
}

// Batch-fetches price/availability/inventory for a set of Shopify product ids in ONE request
// (nodes query) instead of one round trip per product/variant.
export async function shopifyFetchOverlay(env: ShopifyEnv, productIds: string[]): Promise<Map<string, ShopifyOverlayProduct>> {
  const result = new Map<string, ShopifyOverlayProduct>()
  if (productIds.length === 0) return result
  const data = await shopifyGraphQL<{ nodes: (null | {
    id: string
    variants?: { edges: { node: { id: string; availableForSale: boolean; quantityAvailable: number | null; price: { amount: string }; compareAtPrice: { amount: string } | null } }[] }
  })[] }>(
    env,
    `query Overlay($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          variants(first: 100) {
            edges { node { id availableForSale quantityAvailable price { amount } compareAtPrice { amount } } }
          }
        }
      }
    }`,
    { ids: productIds }
  )
  for (const node of data.nodes) {
    if (!node) continue
    result.set(node.id, {
      id: node.id,
      variants: (node.variants?.edges || []).map(e => ({
        id: e.node.id,
        availableForSale: e.node.availableForSale,
        quantityAvailable: e.node.quantityAvailable ?? null,
        price: Number(e.node.price.amount),
        compareAtPrice: e.node.compareAtPrice ? Number(e.node.compareAtPrice.amount) : null
      }))
    })
  }
  return result
}

export interface ShopifyCatalogVariant {
  id: string
  sku: string | null
  selectedOptions: { name: string; value: string }[]
}
export interface ShopifyCatalogProduct {
  id: string
  handle: string
  title: string
  variants: ShopifyCatalogVariant[]
}

// Fetches every published product (with all variants) for the mapping step. Paginates with `after`.
export async function shopifyFetchAllProducts(env: ShopifyEnv): Promise<ShopifyCatalogProduct[]> {
  const products: ShopifyCatalogProduct[] = []
  let after: string | null = null
  for (;;) {
    const data: {
      products: {
        pageInfo: { hasNextPage: boolean }
        edges: { cursor: string; node: {
          id: string; handle: string; title: string
          variants: { edges: { node: { id: string; sku: string | null; selectedOptions: { name: string; value: string }[] } }[] }
        } }[]
      }
    } = await shopifyGraphQL(
      env,
      `query Products($after: String) {
        products(first: 50, after: $after) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              id handle title
              variants(first: 100) { edges { node { id sku selectedOptions { name value } } } }
            }
          }
        }
      }`,
      { after }
    )
    for (const edge of data.products.edges) {
      products.push({
        id: edge.node.id,
        handle: edge.node.handle,
        title: edge.node.title,
        variants: edge.node.variants.edges.map(v => ({ id: v.node.id, sku: v.node.sku, selectedOptions: v.node.selectedOptions }))
      })
    }
    if (!data.products.pageInfo.hasNextPage || data.products.edges.length === 0) break
    after = data.products.edges[data.products.edges.length - 1].cursor
  }
  return products
}
