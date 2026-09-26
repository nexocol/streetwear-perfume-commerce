import { test, expect, type Page, type Route } from '@playwright/test'
import { seedCatalog } from '../src/data/seed'
import { categoryShopLinks } from '../src/lib/clientContent'
import type { CatalogSnapshot, Product } from '../src/types'

const PX='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const teeSlug=seedCatalog.products.find(p=>p.id==='tee-01')!.slug

// tee-01 exactly as the V4.5 proposal leaves it: 3 clean images first, the client's originals AFTER them, the old 3-shirts photo last.
const TEE_MEDIA=[
  ['tee-01-hero-blanca-v1','hero','white'],['tee-01-front-verde-v1','front','mint'],['tee-01-detail-negra-v1','detail','black'],
  ['tee-01-store-1-v1','editorial','group'],
] as const

function media(pid:string,list:readonly (readonly [string,string,string])[]){
  return list.map(([id,mediaType,file],i)=>({id,productId:pid,mediaType,storagePath:null,publicUrl:`/qa/${file}.png`,alt:`${pid} ${file}`,sortOrder:i+1}))
}
function catalog():CatalogSnapshot{
  const c=structuredClone(seedCatalog)
  c.products=c.products.map(p=>p.id==='tee-01'?{...p,status:'active',media:media('tee-01',TEE_MEDIA),
    variants:['Blanco','Verde','Negro'].flatMap((color,ci)=>['S','M','L','XL'].map((size,si)=>({id:`tee-01-${size}-${color}`,productId:'tee-01',size,color,sku:null,price:null,stock:10,available:true,shopifyVariantId:null,sortOrder:ci*4+si+1})))} as Product:p)
  // a second, ordinary camiseta: clean hero first, real store photos after
  const base=structuredClone(c.products.find(p=>p.id==='tee-01')!)
  c.products.push({...base,id:'qa-tee-2',slug:'qa-tee-2',name:'Camiseta QA',nameStatus:'confirmed',featured:false,bestSeller:false,sortOrder:99,
    variants:['S','M'].map((s,i)=>({id:'qa-tee-2-'+s,productId:'qa-tee-2',size:s,color:null,sku:null,price:null,stock:10,available:true,shopifyVariantId:null,sortOrder:i+1})),
    media:media('qa-tee-2',[['qa-tee-2-hero','hero','hero2'],['qa-tee-2-store-1','editorial','store2'],['qa-tee-2-store-2','editorial','store3']])} as Product)
  return c
}
async function mockApi(page:Page){
  const cat=catalog()
  await page.route('**/api/**',async(route:Route)=>{const path=new URL(route.request().url()).pathname;if(path==='/api/catalog')return route.fulfill({json:cat});return route.continue()})
  await page.route('**/qa/*.png',r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from(PX,'base64')}))
  await page.route(/googleusercontent\.com/,r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="12"/>'}))
}
const file=(src:string|null)=>(src||'').split('/').pop()
const links=()=>categoryShopLinks(catalog())
const cats=(page:Page)=>page.locator('.shop-cats a')
const cardCount=(page:Page)=>page.locator('.catalog-grid .card').count()

test.describe('V4.5 category quick nav on /shop',()=>{
  test('lists TODOS + every active category (dynamic), with the real ?cat= links and counts',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/shop')
    const expected=links();expect(expected.length).toBeGreaterThan(1)
    await expect(cats(page)).toHaveCount(expected.length+1)
    const got=await cats(page).evaluateAll(a=>a.map(x=>({href:x.getAttribute('href'),label:x.querySelector('span')!.textContent,count:x.querySelector('sup')!.textContent})))
    expect(got[0]).toEqual({href:'/shop',label:'Todos',count:String(catalog().products.filter(p=>p.status==='active').length)})
    expected.forEach((e,i)=>expect(got[i+1]).toEqual({href:e.to,label:e.label,count:String(e.count)}))
    expect(got.map(g=>g.label)).toContain('Camisetas')
    expect(got.find(g=>g.label==='Camisetas')!.href).toBe('/shop?cat=Streetwear')
  })
  test('selected state follows the URL and the catalog is filtered; TODOS clears the category',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/shop')
    await expect(page.locator('.shop-cats a[aria-current="true"]')).toHaveAttribute('data-cat','Todos')
    const all=await cardCount(page)
    await page.locator('.shop-cats a[data-cat="Streetwear"]').click()
    await expect(page).toHaveURL(/\/shop\?cat=Streetwear$/)
    await expect(page.locator('.shop-cats a[aria-current="true"]')).toHaveAttribute('data-cat','Streetwear')
    await expect(page.locator('.shop-cats a.active')).toHaveCount(1)
    const expected=catalog().products.filter(p=>p.status==='active'&&p.category==='Streetwear').length
    await expect(page.locator('.catalog-grid .card')).toHaveCount(expected)
    await expect(page.locator('.shop-toolbar > span')).toHaveText('CAMISETAS')
    await page.locator('.shop-cats a[data-cat="Todos"]').click()
    await expect(page).toHaveURL(/\/shop$/)
    await expect(page.locator('.catalog-grid .card')).toHaveCount(all)
  })
  test('browser back/forward keep ?cat= and the selected category',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/shop')
    await page.locator('.shop-cats a[data-cat="Streetwear"]').click();await expect(page).toHaveURL(/cat=Streetwear/)
    await page.locator('.shop-cats a[data-cat="Perfumes"]').click();await expect(page).toHaveURL(/cat=Perfumes/)
    await page.goBack();await expect(page).toHaveURL(/cat=Streetwear/);await expect(page.locator('.shop-cats a[aria-current="true"]')).toHaveAttribute('data-cat','Streetwear')
    await page.goBack();await expect(page).toHaveURL(/\/shop$/);await expect(page.locator('.shop-cats a[aria-current="true"]')).toHaveAttribute('data-cat','Todos')
    await page.goForward();await expect(page).toHaveURL(/cat=Streetwear/)
  })
  test('FilterPanel still works together with the category row',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/shop?cat=Streetwear')
    await page.locator('.filter-trigger').click();await expect(page.locator('.filter-panel.open')).toBeVisible()
    await page.locator('.filter-panel.open .filter-option',{hasText:/^M$/}).first().click()
    await expect(page).toHaveURL(/cat=Streetwear/);await expect(page).toHaveURL(/size=M/)
    await expect(page.locator('.shop-cats a[aria-current="true"]')).toHaveAttribute('data-cat','Streetwear')
  })
  test('home -> TIENDA -> CAMISETAS shows only camisetas',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/')
    await page.locator('nav[aria-label="Principal"] a',{hasText:'TIENDA'}).click()
    await page.locator('.shop-cats a[data-cat="Streetwear"]').click()
    const titles=await page.locator('.catalog-grid .card h3').allInnerTexts()
    expect(titles.length).toBeGreaterThan(0);for(const t of titles)expect(t).toMatch(/Camiseta/i)
  })
  for(const width of [768,430,390])test(`@${width}: row scrolls inside itself, keeps the selected item visible, no document overflow`,async({page})=>{
    await page.setViewportSize({width,height:900});await mockApi(page);await page.goto('/shop?cat=Streetwear')
    const m=await page.evaluate(()=>{const n=document.querySelector('.shop-cats') as HTMLElement;const a=n.querySelector('[aria-current="true"]') as HTMLElement;const nr=n.getBoundingClientRect(),ar=a.getBoundingClientRect()
      return {overflowX:getComputedStyle(n).overflowX,visible:ar.left>=nr.left-1&&ar.right<=nr.right+1,docOv:document.documentElement.scrollWidth-innerWidth,wrap:getComputedStyle(a).whiteSpace}})
    expect(m.overflowX).toBe('auto');expect(m.visible).toBe(true);expect(m.docOv).toBeLessThanOrEqual(0);expect(m.wrap).toBe('nowrap')
  })
  for(const width of [1024,768,430,390])test(`@${width}: MENU has compact category links under TIENDA and they filter the shop`,async({page})=>{
    await page.setViewportSize({width,height:900});await mockApi(page);await page.goto('/shop')
    await page.locator('.nav-menu').click();await expect(page.locator('.mobile-menu.open')).toBeVisible()
    const subs=page.locator('.mobile-menu-cats a');const expected=links()
    await expect(subs).toHaveText(expected.map(e=>e.label))
    const sizes=await page.evaluate(()=>({big:parseFloat(getComputedStyle(document.querySelector('.mobile-menu nav > a')!).fontSize),sub:parseFloat(getComputedStyle(document.querySelector('.mobile-menu-cats a')!).fontSize),h:document.querySelector('.mobile-menu-cats a')!.getBoundingClientRect().height}))
    expect(sizes.sub).toBeLessThan(24);expect(sizes.big).toBeGreaterThan(sizes.sub*2);expect(sizes.h).toBeGreaterThanOrEqual(40)
    await page.locator('.mobile-menu-cats a[data-cat="Streetwear"]').click()
    await expect(page).toHaveURL(/\/shop\?cat=Streetwear$/);await expect(page.locator('.mobile-menu.open')).toHaveCount(0)
    const titles=await page.locator('.catalog-grid .card h3').allInnerTexts();for(const t of titles)expect(t).toMatch(/Camiseta/i)
  })
})

test.describe('V4.5 mobile menu: no clipped words',()=>{
  for(const width of [1024,768,430,390])test(`@${width}: FRAGRANCE / EDITORIAL / TIENDA / BUSCAR fit inside the gutters, no overflow`,async({page})=>{
    await page.setViewportSize({width,height:900});await mockApi(page);await page.goto('/shop')
    await page.locator('.nav-menu').click();await expect(page.locator('.mobile-menu.open')).toBeVisible();await page.waitForTimeout(600)
    const m=await page.evaluate(()=>{const vw=document.documentElement.clientWidth;return {docOv:document.documentElement.scrollWidth-vw,items:[...document.querySelectorAll<HTMLElement>('.mobile-menu nav > a, .mobile-menu nav > button')].map(a=>{const r=document.createRange();r.selectNodeContents(a);const b=r.getBoundingClientRect();return {t:a.textContent,right:b.right,clipped:a.scrollWidth>a.clientWidth+1,vw}})}})
    expect(m.items.map(i=>i.t)).toEqual(['TIENDA','FRAGRANCE','EDITORIAL','BUSCAR'])
    for(const i of m.items){expect(i.clipped,i.t+' clipped').toBe(false);expect(i.right,i.t+' right edge').toBeLessThanOrEqual(i.vw-18+1)}
    expect(m.docOv).toBeLessThanOrEqual(0)
  })
})

test.describe('V4.5 tee-01 media safety (the old 3-shirts photo can never be primary/hover/category/editorial)',()=>{
  test('Featured card: primary = clean white, hover = clean mint; originals stay out of the card',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/')
    const card=page.locator('.featured-rail .card',{has:page.locator(`a[href*="${teeSlug}"]`)}).first();await card.scrollIntoViewIfNeeded()
    const srcs=await card.locator('img').evaluateAll(a=>a.map(i=>(i as HTMLImageElement).getAttribute('src')))
    expect(srcs.map(file)).toEqual(['white.png','mint.png'])
  })
  test('Categories preview and Editorial use the clean white shirt',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/')
    const link=page.locator('.collection-links a',{hasText:'CAMISETAS'}).first();await link.scrollIntoViewIfNeeded();await link.hover()
    await expect(page.locator('.category-stage img').first()).toHaveAttribute('src','/qa/white.png')
    await expect(page.locator('.editorial-image img')).toHaveAttribute('src','/qa/white.png')
  })
  test('Shop card for tee-01 and for an ordinary camiseta: media[0] is the primary, media[1] the hover',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/shop?cat=Streetwear')
    const tee=page.locator('.catalog-grid .card',{has:page.locator(`a[href*="${teeSlug}"]`)}).first()
    expect((await tee.locator('img').evaluateAll(a=>a.map(i=>(i as HTMLImageElement).getAttribute('src')))).map(file)).toEqual(['white.png','mint.png'])
    const other=page.locator('.catalog-grid .card',{has:page.locator('a[href*="qa-tee-2"]')}).first()
    expect((await other.locator('img').evaluateAll(a=>a.map(i=>(i as HTMLImageElement).getAttribute('src')))).map(file)).toEqual(['hero2.png','store2.png'])
  })
  test('PDP gallery: clean hero stays media[0]; tee-01 keeps white/mint/black first and the group photo last',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/product/'+teeSlug)
    const order=await page.locator('.gallery img').evaluateAll(a=>a.map(i=>(i as HTMLImageElement).getAttribute('src')!.split('/').pop()))
    expect(order).toEqual(['white.png','mint.png','black.png','group.png'])
    await expect(page.locator('.gallery figure').first()).toHaveClass(/hero-shot/)
    await expect(page.locator('.gallery-indicator')).toHaveText('01 / 04')
    await page.goto('/product/qa-tee-2')
    expect(await page.locator('.gallery img').evaluateAll(a=>a.map(i=>(i as HTMLImageElement).getAttribute('src')!.split('/').pop()))).toEqual(['hero2.png','store2.png','store3.png'])
  })
  test('catalog data rule: for every camiseta media[0] is the clean hero and the group photo is never in the first 3 positions',async()=>{
    const tee=catalog().products.find(p=>p.id==='tee-01')!
    expect(tee.media.map(m=>m.sortOrder)).toEqual([1,2,3,4]);expect(tee.media[0].mediaType).toBe('hero')
    expect(tee.media.slice(0,3).every(m=>/(white|mint|black)\.png$/.test(m.publicUrl!))).toBe(true)
    expect(tee.media.findIndex(m=>/group\.png$/.test(m.publicUrl!))).toBe(3)
    expect(tee.media.length).toBe(4)
  })
})
