// V4.6A Shopify integration QA. Runs the real Worker (wrangler dev --local) against a LOCAL D1
// copy and a local mock Shopify GraphQL server. Never touches remote D1/R2 or the real Shopify API.
//   npm run build && node scripts/shopify-qa.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import http from 'node:http'
import path from 'node:path'

const root = process.cwd()
const wrangler = path.join(root, 'node_modules/wrangler/bin/wrangler.js')
const DB = 'streetwear-perfume-commerce-db'
const work = path.join(tmpdir(), 'v46a-shopify-qa-' + process.pid)
rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true })
if (!existsSync(path.join(root, 'dist/index.html'))) { console.error('dist/ missing: run npm run build first'); process.exit(2) }

let failures = 0
const check = (ok, name, extra = '') => { console.log((ok ? 'PASS: ' : 'FAIL: ') + name + (extra ? '  ' + extra : '')); if (!ok) failures++ }

function sqlFromSchemaTs(name) {
  const src = readFileSync(path.join(root, 'src/server/schema.ts'), 'utf8')
  const m = src.match(new RegExp('export const ' + name + '=String\\.raw`([\\s\\S]*?)`;'))
  if (!m) throw new Error('cannot extract ' + name)
  return m[1]
}
function baseSql() {
  return sqlFromSchemaTs('SCHEMA_SQL') + '\n' + sqlFromSchemaTs('SEED_SQL') + '\n' +
    "INSERT INTO schema_migrations(version,applied_at) VALUES(1,'2026-09-22 22:19:34');\n" +
    "INSERT INTO schema_migrations(version,applied_at) VALUES(2,'2026-09-24 23:36:29');\n" +
    "ALTER TABLE products ADD COLUMN fragrance_family TEXT;\n"
}

const wr = (args, persist) => {
  const r = spawnSync(process.execPath, [wrangler, 'd1', 'execute', DB, '--local', '--persist-to', persist, '--json', ...args], { cwd: root, encoding: 'utf8', maxBuffer: 1e8 })
  if (r.status !== 0) throw new Error('wrangler d1 execute failed: ' + (r.stdout || '') + (r.stderr || ''))
  const out = r.stdout
  return out.includes('[') ? JSON.parse(out.slice(out.indexOf('['))) [0]?.results : []
}
const q = (persist, sql) => wr(['--command', sql], persist)

// ---------- mock Shopify GraphQL server ----------
function startMockShopify() {
  const state = { scenario: 'health-ok', receivedHeaders: [], receivedBodies: [] }
  const server = http.createServer((req, res) => {
    let raw = ''
    req.on('data', c => raw += c)
    req.on('end', () => {
      state.receivedHeaders.push(req.headers)
      let parsed = {}
      try { parsed = JSON.parse(raw) } catch {}
      state.receivedBodies.push(parsed)
      const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)) }
      const query = String(parsed.query || '')

      if (state.scenario === 'graphql-error') return send(200, { errors: [{ message: 'Simulated GraphQL failure' }] })
      if (state.scenario === 'http-500') return send(500, { error: 'boom' })

      if (query.includes('shop {')) return send(200, { data: { shop: { name: 'EL PUNTO WEB (mock)', paymentSettings: { currencyCode: 'COP' } } } })

      if (query.includes('cartCreate')) {
        if (state.scenario === 'cart-user-error') {
          return send(200, { data: { cartCreate: { cart: null, userErrors: [{ field: ['lines'], message: 'Merchandise out of stock' }] } } })
        }
        return send(200, { data: { cartCreate: { cart: { id: 'gid://shopify/Cart/mockcart123', checkoutUrl: 'https://78701p-u5.myshopify.com/checkout/mockcart123' }, userErrors: [] } } })
      }

      if (query.includes('nodes(')) {
        const ids = parsed.variables?.ids || []
        const nodes = ids.map(id => id === 'gid://shopify/Product/1001' ? {
          id,
          variants: { edges: [
            { node: { id: 'gid://shopify/ProductVariant/2001', availableForSale: true, quantityAvailable: 42, price: { amount: '123456.00' }, compareAtPrice: null } }
          ] }
        } : null)
        return send(200, { data: { nodes } })
      }
      return send(400, { errors: [{ message: 'Unhandled mock query' }] })
    })
  })
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, state })))
}

let port = 8890
async function startWorker(persist, vars) {
  const p = port++
  const varArgs = Object.entries(vars).flatMap(([k, v]) => ['--var', `${k}:${v}`])
  const child = spawn(process.execPath, [wrangler, 'dev', '--local', '--persist-to', persist, '--port', String(p), ...varArgs], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''
  child.stdout.on('data', d => log += d); child.stderr.on('data', d => log += d)
  const t0 = Date.now()
  while (!/Ready on/.test(log)) {
    if (Date.now() - t0 > 60000) { child.kill(); throw new Error('wrangler dev did not start:\n' + log) }
    await new Promise(r => setTimeout(r, 300))
  }
  return {
    base: 'http://127.0.0.1:' + p,
    stop: async () => {
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'])
      else child.kill('SIGKILL')
      await new Promise(r => setTimeout(r, 800))
    }
  }
}
const j = async res => ({ status: res.status, body: await res.json().catch(() => null) })

async function run() {
  const mock = await startMockShopify()
  const FAKE_TOKEN = 'test-token-not-a-real-secret'
  const vars = {
    ADMIN_DEV_BYPASS: 'true',
    SHOPIFY_STORE_DOMAIN: 'unused-in-tests.myshopify.com',
    SHOPIFY_STOREFRONT_API_VERSION: '2026-07',
    SHOPIFY_GRAPHQL_ENDPOINT: `http://127.0.0.1:${mock.port}/graphql`,
    SHOPIFY_STOREFRONT_PRIVATE_TOKEN: FAKE_TOKEN
  }

  // ---------- fixture DB: seed + one product mapped to Shopify, one left unmapped ----------
  const dbA = path.join(work, 'a'); mkdirSync(dbA)
  const sqlFile = path.join(work, 'seed.sql')
  writeFileSync(sqlFile, baseSql())
  wr(['--file', sqlFile], dbA)
  q(dbA, "UPDATE products SET shopify_product_id='gid://shopify/Product/1001' WHERE id='tee-01'")
  q(dbA, "UPDATE variants SET shopify_variant_id='2001' WHERE id='tee-01-S'")
  // perfume-01 stays fully unmapped on purpose (used for the "reject unmapped variant" case)

  console.log('\n== A. healthcheck ==')
  let w = await startWorker(dbA, vars)
  mock.state.scenario = 'health-ok'
  let r = await j(await fetch(w.base + '/api/shopify/health'))
  check(r.status === 200 && r.body.ok === true && r.body.shopName === 'EL PUNTO WEB (mock)' && r.body.currency === 'COP', 'health: ok=true with shop name/currency from Shopify', JSON.stringify(r.body))
  check(!JSON.stringify(r.body).includes(FAKE_TOKEN), 'health: response never contains the token')
  const lastHeaders = mock.state.receivedHeaders.at(-1)
  check(lastHeaders['shopify-storefront-private-token'] === FAKE_TOKEN, 'health: request carried the private token header (server-side only)')

  mock.state.scenario = 'graphql-error'
  r = await j(await fetch(w.base + '/api/shopify/health'))
  check(r.status === 503 && r.body.ok === false && !!r.body.error, 'health: GraphQL error surfaces as ok=false / 503', JSON.stringify(r.body))
  check(!JSON.stringify(r.body).includes(FAKE_TOKEN), 'health error body never contains the token')

  mock.state.scenario = 'http-500'
  r = await j(await fetch(w.base + '/api/shopify/health'))
  check(r.status === 503 && r.body.ok === false, 'health: Shopify HTTP 500 surfaces as ok=false / 503')

  console.log('\n== B. checkout payload validation ==')
  mock.state.scenario = 'cart-success'
  const post = body => fetch(w.base + '/api/shopify/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' }, body: JSON.stringify(body) })
  r = await j(await post({}))
  check(r.status === 400, 'checkout: missing lines -> 400', JSON.stringify(r.body))
  r = await j(await post({ lines: [] }))
  check(r.status === 400, 'checkout: empty lines -> 400')
  r = await j(await post({ lines: [{ variantId: 'tee-01-S', quantity: 0 }] }))
  check(r.status === 400, 'checkout: quantity 0 -> 400')
  r = await j(await post({ lines: [{ variantId: 'tee-01-S', quantity: 999 }] }))
  check(r.status === 400, 'checkout: quantity above cap -> 400')
  r = await j(await post({ lines: [{ variantId: 'tee-01-S', quantity: 1.5 }] }))
  check(r.status === 400, 'checkout: non-integer quantity -> 400')
  r = await j(await post({ lines: [{ variantId: 'does-not-exist', quantity: 1 }] }))
  check(r.status === 400 && /desconocid/i.test(r.body.error), 'checkout: unknown local variant id -> 400', JSON.stringify(r.body))
  r = await j(await post({ lines: [{ variantId: 'perfume-01-u', quantity: 1 }] }))
  check(r.status === 409 && /mapping/i.test(r.body.error), 'checkout: known variant without shopify_variant_id -> 409', JSON.stringify(r.body))

  console.log('\n== C. checkout: server ignores client-supplied Shopify/price data ==')
  r = await j(await post({ lines: [{ variantId: 'tee-01-S', quantity: 2, shopifyVariantId: 'gid://shopify/ProductVariant/9999999', price: 1 }] }))
  check(r.status === 200 && r.body.checkoutUrl && r.body.cartId, 'checkout: mapped variant succeeds', JSON.stringify(r.body))
  const cartBody = mock.state.receivedBodies.at(-1)
  check(cartBody.variables.input.lines[0].merchandiseId === 'gid://shopify/ProductVariant/2001', 'checkout: cart uses the D1-mapped Shopify variant id, not the client-supplied one')
  check(cartBody.variables.input.lines[0].quantity === 2, 'checkout: quantity passed through correctly')
  const buyerIpHeader = mock.state.receivedHeaders.at(-1)['shopify-storefront-buyer-ip']
  check(buyerIpHeader === '203.0.113.9', 'checkout: buyer IP forwarded from CF-Connecting-IP header')

  mock.state.scenario = 'cart-user-error'
  r = await j(await post({ lines: [{ variantId: 'tee-01-S', quantity: 1 }] }))
  check(r.status === 400 && /out of stock/i.test(r.body.error), 'checkout: Shopify userErrors surfaced as 400', JSON.stringify(r.body))

  await w.stop()

  console.log('\n== D. Shopify not configured ==')
  w = await startWorker(dbA, { ADMIN_DEV_BYPASS: 'true' })
  r = await j(await fetch(w.base + '/api/shopify/health'))
  check(r.status === 503 && r.body.configured === false, 'health: unconfigured -> configured=false / 503')
  r = await j(await post({ lines: [{ variantId: 'tee-01-S', quantity: 1 }] }))
  check(r.status === 503, 'checkout: unconfigured -> 503')
  await w.stop()

  console.log('\n== E. catalog overlay: off by default, applied when shopify_enabled=1 ==')
  w = await startWorker(dbA, vars)
  let cat = await j(await fetch(w.base + '/api/catalog'))
  const teeVariantOff = cat.body.products.find(p => p.id === 'tee-01').variants.find(v => v.id === 'tee-01-S')
  check(teeVariantOff.price === null && teeVariantOff.stock === null, 'catalog: shopify_enabled=0 -> D1 values untouched (preview unchanged)', JSON.stringify(teeVariantOff))

  const settingsPut = await j(await fetch(w.base + '/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopifyEnabled: true, previewNoindex: true, storeStatus: 'preview' }) }))
  check(settingsPut.status === 200, 'admin settings: shopify_enabled can be toggled on')

  mock.state.scenario = 'overlay-ok'
  cat = await j(await fetch(w.base + '/api/catalog'))
  const teeVariantOn = cat.body.products.find(p => p.id === 'tee-01').variants.find(v => v.id === 'tee-01-S')
  check(teeVariantOn.price === 123456 && teeVariantOn.stock === 42 && teeVariantOn.available === true, 'catalog: shopify_enabled=1 -> mapped variant price/stock come from Shopify overlay', JSON.stringify(teeVariantOn))
  const unmappedPerfume = cat.body.products.find(p => p.id === 'perfume-01').variants.find(v => v.id === 'perfume-01-u')
  check(unmappedPerfume.price === null, 'catalog: unmapped product keeps its D1 (null variant price) untouched by the overlay', JSON.stringify(unmappedPerfume))
  check(JSON.stringify(cat.body).indexOf(FAKE_TOKEN) === -1, 'catalog response never contains the token')
  check(cat.body.site.shopifyEnabled === true, 'catalog: site.shopifyEnabled reflects the CMS toggle (drives the admin "managed in Shopify" UI)')
  await w.stop()

  const noSecretInSource = () => {
    const files = ['src/worker.ts', 'src/server/shopify.ts', 'src/commerce/ShopifyCommerceProvider.ts', 'src/commerce/CommerceProvider.tsx']
    for (const f of files) {
      const src = readFileSync(path.join(root, f), 'utf8')
      if (/shpat_|shpss_/.test(src)) return false
    }
    return true
  }
  check(noSecretInSource(), 'security: no hardcoded Shopify token pattern in source files')

  mock.server.close()
}

try { await run() } catch (e) { console.error('QA crashed:', e); failures++ }
finally { rmSync(work, { recursive: true, force: true }) }
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll Shopify integration checks passed')
process.exit(failures ? 1 : 0)
