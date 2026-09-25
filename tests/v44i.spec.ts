import { test, expect, type Page, type Route } from '@playwright/test'
import { seedCatalog } from '../src/data/seed'
import type { CatalogSnapshot, Product } from '../src/types'

// tee-01 as V4.4I leaves it in D1: ONE product, 3 colors x 4 sizes, 3 clean product photos (white / mint / black).
const SIZES=['S','M','L','XL'],COLORS=['Blanco','Verde','Negro']
const PX='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const MEDIA=[
  {id:'tee-01-hero-blanca-v1',mediaType:'hero',url:'/qa-tee/white.png',alt:'Camiseta Motion Gráfica blanca'},
  {id:'tee-01-front-verde-v1',mediaType:'front',url:'/qa-tee/mint.png',alt:'Camiseta Motion Gráfica verde'},
  {id:'tee-01-detail-negra-v1',mediaType:'detail',url:'/qa-tee/black.png',alt:'Camiseta Motion Gráfica negra'},
] as const

function catalog():CatalogSnapshot{
  const c=structuredClone(seedCatalog)
  c.products=c.products.map(p=>p.id!=='tee-01'?p:{
    ...p,name:'Camiseta Motion Gráfica',nameStatus:'provisional',price:100000,color:'Blanco / Verde / Negro',status:'active',
    variants:COLORS.flatMap((color,ci)=>SIZES.map((size,si)=>({id:`tee-01-${size}-${color.toLowerCase()}`,productId:'tee-01',size,color,sku:null,price:null,stock:10,available:true,shopifyVariantId:null,sortOrder:ci*4+si+1}))),
    media:MEDIA.map((m,i)=>({id:m.id,productId:'tee-01',mediaType:m.mediaType,storagePath:null,publicUrl:m.url,alt:m.alt,sortOrder:i+1})),
  } as Product)
  return c
}
async function mockApi(page:Page){
  const cat=catalog()
  await page.route('**/api/**',async(route:Route)=>{
    const path=new URL(route.request().url()).pathname
    if(path==='/api/catalog')return route.fulfill({json:cat})
    return route.continue()
  })
  await page.route('**/qa-tee/*.png',r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from(PX,'base64')}))
  await page.route(/googleusercontent\.com/,r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="12"/>'}))
}
const slug=seedCatalog.products.find(p=>p.id==='tee-01')!.slug
const file=(src:string|null)=>(src||'').split('/').pop()

test.describe('V4.4I tee-01 final motion images',()=>{
  test('Home: featured, categories preview and editorial use the individual white shirt (media[0]); hover uses media[1]',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/')
    const card=page.locator('.featured-rail .card',{has:page.locator(`a[href*="${slug}"]`)}).first()
    await card.scrollIntoViewIfNeeded()
    const cardSrcs=await card.locator('img').evaluateAll(a=>a.map(i=>(i as HTMLImageElement).getAttribute('src')))
    expect(cardSrcs.map(file)).toEqual(['white.png','mint.png'])
    const link=page.locator('.collection-links a',{hasText:'CAMISETAS'}).first();await link.scrollIntoViewIfNeeded();await link.hover()
    await expect(page.locator('.category-stage img').first()).toHaveAttribute('src','/qa-tee/white.png')
    await expect(page.locator('.editorial-image img')).toHaveAttribute('src','/qa-tee/white.png')
  })

  test('Home: ENCUENTRA gets the same bridge backing as TU ESTILO; AQUÍ. is untouched',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/')
    const spans=page.locator('#editorial-title > *')
    await expect(spans).toHaveText(['ENCUENTRA','TU ESTILO','AQUÍ.'])
    const bg=await spans.evaluateAll(a=>a.map(e=>getComputedStyle(e,'::before').backgroundImage))
    expect(bg[0]).toContain('linear-gradient');expect(bg[1]).toBe(bg[0]);expect(bg[2]).toBe('none')
    await expect(spans.nth(2)).not.toHaveClass(/editorial-title-bridge/)
  })

  test('PDP: gallery 01 Blanca / 02 Verde / 03 Negra, COLOR + TALLA selectors',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/product/'+slug)
    const imgs=page.locator('.gallery img')
    await expect(imgs).toHaveCount(3)
    expect(await imgs.evaluateAll(a=>a.map(i=>(i as HTMLImageElement).alt))).toEqual(MEDIA.map(m=>m.alt))
    await expect(page.locator('.gallery-indicator')).toHaveText('01 / 03')
    await expect(page.locator('.color-options button')).toHaveText(COLORS)
    await expect(page.locator('.sizes button')).toHaveText(SIZES)
  })

  test('PDP: the 12 color x size combinations reach the cart as distinct COLOR / TALLA lines',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/product/'+slug)
    for(const color of COLORS)for(const size of SIZES){
      await page.locator('.color-options button',{hasText:new RegExp(`^${color}$`)}).click()
      await expect(page.getByTestId('selected-color')).toHaveText(color)
      await page.locator('.sizes button',{hasText:new RegExp(`^${size}$`)}).click()
      await page.locator('.add-button').click()
      await page.locator('.cart[aria-hidden="false"]').waitFor()
      await page.locator('.cart header button').click()
      await page.locator('.cart[aria-hidden="true"]').waitFor({state:'attached'})
    }
    await page.locator('.bag-action').first().click();await page.locator('.cart[aria-hidden="false"]').waitFor()
    const lines=await page.locator('.cart-item').evaluateAll(a=>a.map(x=>`${x.querySelector('[data-testid=cart-color]')?.textContent}|${x.querySelector('[data-testid=cart-size]')?.textContent}`))
    expect(new Set(lines).size).toBe(12)
    for(const color of COLORS)for(const size of SIZES)expect(lines).toContain(`COLOR / ${color}|TALLA / ${size}`)
  })

  for(const width of [1440,1024,768,430,390])test(`no horizontal overflow at ${width}: Home and PDP`,async({page})=>{
    await page.setViewportSize({width,height:width>=1024?1000:900});await mockApi(page)
    for(const path of ['/','/product/'+slug]){
      await page.goto(path);await page.locator('.hero, .pdp').first().waitFor()
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth),`overflow ${path}`).toBeLessThanOrEqual(0)
    }
  })
})
