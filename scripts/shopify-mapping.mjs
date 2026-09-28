// V4.6A mapping step (spec section 11/12).
// Reads live D1 (remote, read-only) + the live Shopify Storefront API (read-only) and produces
// MAPPING_AUDIT.md plus ready-to-review apply/rollback SQL. Never writes to D1 itself.
//
// Run from the repo root, in your OWN terminal (never paste the token into chat):
//   $env:SHOPIFY_STOREFRONT_PRIVATE_TOKEN = 'shpat_...'   (PowerShell)
//   node scripts/shopify-mapping.mjs
//
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'

const DB = 'streetwear-perfume-commerce-db'
const DOMAIN = '78701p-u5.myshopify.com'
const API_VERSION = '2026-07'
const OUT_SHOPIFY = 'C:/Users/casa/v46a/shopify'
const OUT_SQL = 'C:/Users/casa/v46a/sql'
mkdirSync(OUT_SHOPIFY, { recursive: true })
mkdirSync(OUT_SQL, { recursive: true })

const token = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN
if (!token) {
  console.error('SHOPIFY_STOREFRONT_PRIVATE_TOKEN no está definido en el entorno. Este script nunca debe recibirlo por chat.')
  console.error("PowerShell: $env:SHOPIFY_STOREFRONT_PRIVATE_TOKEN = 'shpat_...'; node scripts/shopify-mapping.mjs")
  process.exit(2)
}

function d1(sql) {
  const r = spawnSync('npx', ['wrangler', 'd1', 'execute', DB, '--remote', '--command', sql, '--json'], { encoding: 'utf8', maxBuffer: 1e8, shell: true })
  if (r.status !== 0) throw new Error('wrangler d1 execute failed: ' + (r.stdout || '') + (r.stderr || ''))
  const out = r.stdout
  return JSON.parse(out.slice(out.indexOf('[')))[0].results
}

async function shopifyGraphQL(query, variables = {}) {
  const res = await fetch(`https://${DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Shopify-Storefront-Private-Token': token },
    body: JSON.stringify({ query, variables })
  })
  if (!res.ok) throw new Error(`Shopify HTTP ${res.status}`)
  const body = await res.json()
  if (body.errors?.length) throw new Error('Shopify GraphQL error: ' + body.errors.map(e => e.message).join('; '))
  return body.data
}

async function fetchAllShopifyProducts() {
  const products = []
  let after = null
  for (;;) {
    const data = await shopifyGraphQL(
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

async function run() {
  console.log('Reading D1 (remote, read-only)...')
  const localProducts = d1('SELECT id,slug,name,shopify_product_id,shopify_handle FROM products ORDER BY sort_order')
  const localVariants = d1('SELECT id,product_id,size,color,shopify_variant_id FROM variants ORDER BY product_id,sort_order')
  const variantsByProduct = new Map()
  for (const v of localVariants) { const a = variantsByProduct.get(v.product_id) || []; a.push(v); variantsByProduct.set(v.product_id, a) }

  console.log('Querying Shopify Storefront API (read-only, published products)...')
  const shopifyProducts = await fetchAllShopifyProducts()
  const shopifyByHandle = new Map(shopifyProducts.map(p => [p.handle, p]))
  const shopifySkuIndex = new Map() // sku -> {productId, variantId, product}
  for (const sp of shopifyProducts) for (const v of sp.variants) if (v.sku) shopifySkuIndex.set(v.sku, { productId: sp.id, variantId: v.id, product: sp })

  const audit = []
  const applySql = []
  const rollbackSql = []
  let matchedProducts = 0, matchedVariants = 0, totalVariants = 0, ambiguous = 0
  const problems = []

  for (const p of localProducts) {
    const locVariants = variantsByProduct.get(p.id) || []
    totalVariants += locVariants.length
    const sp = shopifyByHandle.get(p.slug)
    if (!sp) {
      problems.push(`${p.id}: no existe un producto publicado en Shopify con handle="${p.slug}"`)
      audit.push({ product: p.name, localId: p.id, shopifyProductId: '(sin match)', handle: p.slug, localVariants: locVariants.length, shopifyVariants: 0, result: 'SIN MATCH' })
      continue
    }
    if (sp.handle !== p.slug) problems.push(`${p.id}: handle de Shopify ("${sp.handle}") difiere del slug local ("${p.slug}")`)

    let productOk = true
    const variantResults = []
    for (const lv of locVariants) {
      const hit = shopifySkuIndex.get(lv.id)
      if (!hit || hit.productId !== sp.id) {
        problems.push(`${p.id}/${lv.id}: no se encontró una variante de Shopify con SKU="${lv.id}" en el producto ${sp.handle}`)
        productOk = false
        variantResults.push({ lv, ok: false })
        continue
      }
      const shopifyVariant = sp.variants.find(v => v.id === hit.variantId)
      const options = Object.fromEntries((shopifyVariant.selectedOptions || []).map(o => [o.name, o.value]))
      const expectedColor = lv.color || null
      const expectedSize = lv.size
      const colorOk = expectedColor ? options.Color === expectedColor : !('Color' in options)
      const sizeOk = options.Talla === expectedSize
      if (!colorOk || !sizeOk) {
        ambiguous++
        problems.push(`${p.id}/${lv.id}: SKU coincide pero las opciones difieren (esperado color=${expectedColor ?? '—'} talla=${expectedSize}; Shopify=${JSON.stringify(options)})`)
        productOk = false
        variantResults.push({ lv, ok: false })
        continue
      }
      variantResults.push({ lv, ok: true, shopifyVariantId: hit.variantId })
      matchedVariants++
    }

    if (productOk && variantResults.every(r => r.ok)) {
      matchedProducts++
      applySql.push(`UPDATE products SET shopify_product_id='${sp.id}', shopify_handle='${sp.handle}', updated_at=CURRENT_TIMESTAMP WHERE id='${p.id}';`)
      rollbackSql.push(`UPDATE products SET shopify_product_id=NULL, shopify_handle=NULL, updated_at=CURRENT_TIMESTAMP WHERE id='${p.id}';`)
      for (const r of variantResults) {
        applySql.push(`UPDATE variants SET shopify_variant_id='${r.shopifyVariantId}', updated_at=CURRENT_TIMESTAMP WHERE id='${r.lv.id}';`)
        rollbackSql.push(`UPDATE variants SET shopify_variant_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE id='${r.lv.id}';`)
      }
    }

    audit.push({
      product: p.name, localId: p.id, shopifyProductId: sp.id, handle: sp.handle,
      localVariants: locVariants.length, shopifyVariants: sp.variants.length,
      result: productOk && variantResults.every(r => r.ok) ? 'OK' : 'REVISAR'
    })
  }

  const mdLines = []
  mdLines.push('# Mapping Audit — D1 <-> Shopify')
  mdLines.push('')
  mdLines.push(`Generated: ${new Date().toISOString()}`)
  mdLines.push(`Products matched: ${matchedProducts}/${localProducts.length} | Variants matched: ${matchedVariants}/${totalVariants} | Ambiguous: ${ambiguous}`)
  mdLines.push('')
  mdLines.push('| PRODUCT | LOCAL ID | SHOPIFY PRODUCT ID | HANDLE | LOCAL VARIANTS | SHOPIFY VARIANTS | MATCH RESULT |')
  mdLines.push('|---|---|---|---|---|---|---|')
  for (const a of audit) mdLines.push(`| ${a.product} | ${a.localId} | ${a.shopifyProductId} | ${a.handle} | ${a.localVariants} | ${a.shopifyVariants} | ${a.result} |`)
  mdLines.push('')
  mdLines.push('## Problems')
  if (problems.length === 0) mdLines.push('- None')
  else for (const p of problems) mdLines.push(`- ${p}`)
  writeFileSync(`${OUT_SHOPIFY}/MAPPING_AUDIT.md`, mdLines.join('\n'), 'utf8')

  console.log(`Products matched: ${matchedProducts}/${localProducts.length}`)
  console.log(`Variants matched: ${matchedVariants}/${totalVariants}`)
  console.log(`Ambiguous: ${ambiguous}`)
  console.log(`Audit written to ${OUT_SHOPIFY}/MAPPING_AUDIT.md`)

  const clean = matchedProducts === localProducts.length && matchedVariants === totalVariants && ambiguous === 0
  if (clean) {
    writeFileSync(`${OUT_SQL}/apply_shopify_mapping.sql`, applySql.join('\n') + '\n', 'utf8')
    writeFileSync(`${OUT_SQL}/rollback_shopify_mapping.sql`, rollbackSql.join('\n') + '\n', 'utf8')
    console.log(`\n28/28, 128/128, 0 ambiguous -> SQL written:`)
    console.log(`  ${OUT_SQL}/apply_shopify_mapping.sql`)
    console.log(`  ${OUT_SQL}/rollback_shopify_mapping.sql`)
    console.log('\nThese are NOT executed. Review the diff, then run manually or ask Claude to run it after you confirm.')
  } else {
    console.log('\nNOT clean — see MAPPING_AUDIT.md "Problems" section. No SQL written. Fix in Shopify Admin and re-run this script.')
  }
}

run().catch(e => { console.error('Mapping failed:', e.message); process.exit(1) })
