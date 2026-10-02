import {test,expect,type Page} from '@playwright/test'
import {seedCatalog} from '../src/data/seed'
import {categoryShopLinks} from '../src/lib/clientContent'

async function fixture(page:Page){
  const catalog=structuredClone(seedCatalog)
  catalog.site.shopifyEnabled=true
  catalog.products.find(p=>p.category==='Jeans')!.name='Pantalón Negro Desgastado'
  for(const p of catalog.products)for(const v of p.variants){v.price=100000;v.stock=10;v.available=true;v.shopifyVariantId='gid://shopify/ProductVariant/qa-'+v.id}
  // Five active categories exercise the odd final row in the mobile index.
  catalog.categories.push({id:'qa-shorts',slug:'shorts',name:'Shorts',enabled:true,sortOrder:6})
  catalog.products.push({...structuredClone(catalog.products[0]),id:'qa-shorts',slug:'qa-shorts',categoryId:'qa-shorts',category:'Shorts'})
  const writes:string[]=[]
  await page.route('**/api/**',route=>{
    if(route.request().method()!=='GET'){writes.push(route.request().url());return route.abort()}
    if(new URL(route.request().url()).pathname==='/api/catalog')return route.fulfill({json:catalog})
    return route.fulfill({status:403,json:{error:'QA blocks other APIs'}})
  })
  await page.route(/googleusercontent\.com/,r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="24"/>'}))
  return {catalog,writes}
}

for(const [width,height] of [[1440,1000],[1280,800],[1024,900],[768,1024],[430,900],[390,844]])test(`V5 shopping composition @${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height})
  const {catalog,writes}=await fixture(page)
  await page.goto('/')
  const nav=page.getByRole('navigation',{name:'Comprar por categoría'})
  await expect(nav.getByRole('link')).toHaveCount(categoryShopLinks(catalog).length)
  for(const link of await nav.getByRole('link').all()){
    await expect(link).toBeInViewport()
    const box=await link.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44)
  }
  if(width<=768){
    const boxes=await nav.getByRole('link').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width}}))
    expect(boxes[0].y).toEqual(boxes[1].y)
    expect(boxes[2].y).toBeGreaterThan(boxes[0].y)
    expect(boxes.at(-1)!.width).toBeGreaterThan(boxes[0].width*1.9)
  }
  await page.locator('.hero-shop-cta').focus()
  await expect(page.locator('.hero-shop-cta')).toBeFocused()
  await expect(page.locator('.hero-shop-cta')).toHaveCSS('outline-style','solid')
  await nav.getByRole('link').first().click()
  await expect(page).toHaveURL(/\/shop\?cat=Jeans/)
  await page.evaluate(()=>document.fonts.ready)
  const title=await page.locator('.shop-hero h1').evaluate(el=>{
    const range=document.createRange();range.selectNodeContents(el)
    const bounds=el.getBoundingClientRect()
    return {edge:bounds.right,lines:[...range.getClientRects()].map(r=>r.right)}
  })
  for(const right of title.lines)expect(right).toBeLessThanOrEqual(title.edge+1)
  const slug=catalog.products.find(p=>p.category==='Jeans')!.slug
  await page.goto('/product/'+slug)
  await page.evaluate(()=>document.fonts.ready)
  const productTitle=await page.locator('.pdp-info h1').evaluate(el=>{
    const range=document.createRange();range.selectNodeContents(el)
    return {edge:el.getBoundingClientRect().right,textEdge:Math.max(...[...range.getClientRects()].map(r=>r.right))}
  })
  expect(productTitle.textEdge).toBeLessThanOrEqual(productTitle.edge+1)
  const eyebrow=page.locator('.related-head>span'),heading=page.locator('#related-title')
  expect((await eyebrow.boundingBox())!.y).toBeLessThan((await heading.boundingBox())!.y)
  // Reveal callbacks are unnecessary for shopping cards to be visible.
  for(const opacity of await page.locator('.related-grid .card').evaluateAll(els=>els.map(el=>getComputedStyle(el).opacity)))expect(opacity).toBe('1')
  await page.locator('.trust-rail').scrollIntoViewIfNeeded()
  const cards=await page.locator('.trust-rail button').evaluateAll(els=>els.map(el=>{
    const b=el.querySelector('b')!.getBoundingClientRect(),icon=el.querySelector('.trust-arrow')!.getBoundingClientRect(),copy=el.querySelector('small')!.getBoundingClientRect(),box=el.getBoundingClientRect()
    return {height:box.height,gap:icon.left-b.right,copyGap:copy.top-b.bottom,titleEdge:b.right,edge:box.right}
  }))
  for(const card of cards){expect(card.height).toBeGreaterThanOrEqual(44);expect(card.gap).toBeGreaterThanOrEqual(7);expect(card.copyGap).toBeGreaterThanOrEqual(8);expect(card.titleEdge).toBeLessThan(card.edge)}
  await page.locator('.trust-rail button').first().click()
  await expect(page.locator('#size-dialog')).toBeVisible()
  await page.locator('#size-dialog .dialog-close').click()
  await page.locator('.sizes button').first().click()
  await page.locator('.add-button').click()
  await expect(page.locator('.cart[aria-hidden="false"]')).toBeVisible()
  await expect(page.getByTestId('cart-size')).toContainText('TALLA')
  await expect(page.locator('.cart .quantity button').first()).toHaveAccessibleName(/Reducir cantidad/)
  await page.getByRole('button',{name:'FINALIZAR COMPRA',exact:true}).click()
  await expect(page.locator('#precheckout-title')).toHaveText('¿CÓMO QUIERES COMPRAR?')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  expect(writes).toEqual([])
})

test('V5 reduced motion preserves usable, static shopping controls',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'})
  await fixture(page);await page.goto('/')
  const cta=page.locator('.hero-shop-cta')
  await expect(cta).toHaveCSS('animation-name','none')
  await expect(cta).toHaveCSS('transition-duration','0s')
  await cta.hover();await expect(cta).toHaveCSS('transform','none')
  await expect(page.locator('.hero-main-frame')).toHaveCSS('clip-path','none')
  await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.gsapMotion)).toBe('reduced')
  await expect(page.locator('.hero-category-jump')).toBeVisible()
})
