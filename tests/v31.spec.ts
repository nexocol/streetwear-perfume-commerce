import { test, expect, type Page, type Route } from '@playwright/test'
import { seedCatalog } from '../src/data/seed'

async function mockApi(page:Page){
  await page.route('**/api/**',async(route:Route)=>{
    const req=route.request();const url=new URL(req.url());const path=url.pathname
    if(path==='/api/catalog')return route.fulfill({json:seedCatalog})
    if(path==='/api/admin/session')return route.fulfill({json:{email:'qa@nexo.local'}})
    if(path==='/api/admin/catalog')return route.fulfill({json:seedCatalog})
    if(path==='/api/admin/home/editorial-image')return route.fulfill({status:201,json:{url:seedCatalog.homepage.editorialImageUrl}})
    if(path==='/api/admin/home'||path==='/api/admin/settings'||path.startsWith('/api/admin/taxonomy/'))return route.fulfill({json:{ok:true}})
    if(path.includes('/duplicate'))return route.fulfill({json:{id:'qa-copy-id'}})
    if(path.endsWith('/status'))return route.fulfill({json:{ok:true}})
    if(path.includes('/media'))return route.fulfill({status:req.method()==='POST'?201:200,json:{ok:true}})
    if(path.startsWith('/api/admin/products/')&&req.method()==='PUT'){const body=JSON.parse(req.postData()||'{}');return route.fulfill({json:body.product})}
    return route.continue()
  })
}
async function waitStore(page:Page){await expect(page.locator('.hero, .shop-hero, .pdp, .admin-page').first()).toBeVisible()}
async function revealForScreenshot(page:Page){
  await page.evaluate(async()=>{
    const max=document.documentElement.scrollHeight-window.innerHeight
    for(let y=0;y<=max;y+=Math.max(420,window.innerHeight*.68)){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,35))}
    window.scrollTo(0,max);await new Promise(r=>setTimeout(r,80));window.scrollTo(0,0)
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el=>el.classList.add('visible'))
  })
  await page.waitForTimeout(250)
}
async function expectViewportSafe(page:Page){
  const overflow=await page.evaluate(()=>{const w=innerWidth;return [...document.querySelectorAll<HTMLElement>('main *,.footer *')].filter(el=>{const s=getComputedStyle(el);const r=el.getBoundingClientRect();return el.getClientRects().length>0&&s.display!=='none'&&s.visibility!=='hidden'&&!el.closest('dialog:not([open])')&&(r.left < -1 || r.right>w+1)&&!el.closest('.ticker,.featured-rail,.gallery')}).slice(0,10).map(el=>({el:el.className||el.tagName,left:Math.round(el.getBoundingClientRect().left),right:Math.round(el.getBoundingClientRect().right),text:(el.textContent||'').trim().slice(0,40)}))});expect(overflow).toEqual([])
  const clipped=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('h1,h2')].filter(el=>{
    const r=document.createRange();r.selectNodeContents(el);const b=r.getBoundingClientRect();return b.left < -1 || b.right > window.innerWidth+1
  }).map(el=>el.textContent?.trim()))
  expect(clipped).toEqual([])
}

test('V4 storefront critical journey',async({page})=>{
  await mockApi(page);await page.goto('/');await waitStore(page)
  await page.getByRole('button',{name:'Buscar'}).click()
  await page.getByRole('textbox',{name:'Buscar productos'}).fill('DENIM')
  await expect(page.locator('.search-results a')).toHaveCount(2)
  await page.keyboard.press('Escape')
  await page.getByRole('link',{name:'VER LA COLECCIÓN'}).click()
  await expect(page.locator('.shop-hero')).toBeVisible()
  await page.getByRole('button',{name:/FILTRAR/}).click()
  await page.getByRole('button',{name:'Jeans',exact:true}).click()
  await page.getByRole('button',{name:/VER 2 PRODUCTOS/}).click()
  await expect(page.locator('.catalog .card')).toHaveCount(2)
  await page.locator('.catalog .media').first().click()
  await expect(page.locator('.pdp-info')).toBeVisible()

  const sizeGuide=page.locator('.pdp-info .text-link')
  if(await sizeGuide.count()){await sizeGuide.click();await expect(page.locator('#size-dialog')).toBeVisible();await page.locator('#size-dialog .dialog-close').click()}

  await page.locator('.sizes button').first().click()
  await page.getByRole('button',{name:'AGREGAR AL CARRITO'}).click()
  await expect(page.locator('.cart-item')).toHaveCount(1)
  await page.locator('.quantity button').last().click();await expect(page.locator('.quantity span')).toHaveText('2')
  await page.locator('.quantity button').first().click();await expect(page.locator('.quantity span')).toHaveText('1')
  await page.getByRole('button',{name:'ELIMINAR'}).click();await expect(page.locator('.cart-item')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.related .card').first()).toBeVisible()
  await page.locator('.related .media').first().click();await expect(page.locator('.pdp-info')).toBeVisible()
  await page.goBack();await expect(page.locator('.pdp-info')).toBeVisible()
})

test('admin primary operations remain intact',async({page})=>{
  await mockApi(page);await page.goto('/admin/home');await expect(page.getByRole('heading',{name:'HOME.'})).toBeVisible()
  const headline=page.getByLabel('Titular');await headline.fill('DROP / 001\\nQA')
  await expect(page.locator('.admin-savebar')).toHaveClass(/visible/)
  await page.locator('.admin-savebar').getByRole('button',{name:'GUARDAR CAMBIOS'}).click()
  await expect(page.getByText('Cambios guardados correctamente.')).toBeVisible()
  await page.goto('/admin/products');await expect(page.locator('.admin-product-list article')).toHaveCount(6)
  await page.locator('.admin-product-list article').first().getByRole('link',{name:'EDITAR'}).click()
  await page.getByLabel('Subtítulo').fill('QA subtitle')
  await page.getByRole('button',{name:'GUARDAR',exact:true}).click()
  await expect(page.getByRole('button',{name:/GUARDADO/})).toBeVisible()
})

for(const [width,height] of [[1920,1080],[1440,1000],[1024,900],[768,1024],[430,900],[390,844]]){
  test(`visual home ${width}`,async({page})=>{await page.setViewportSize({width,height});await mockApi(page);await page.goto('/');await waitStore(page);await revealForScreenshot(page);await page.screenshot({path:`qa-screenshots/home-${width}.png`,fullPage:true});await expectViewportSafe(page)})
}
for(const [width,height] of [[1440,1000],[430,900]]){
  test(`visual shop ${width}`,async({page})=>{await page.setViewportSize({width,height});await mockApi(page);await page.goto('/shop');await waitStore(page);await revealForScreenshot(page);await page.screenshot({path:`qa-screenshots/shop-${width}.png`,fullPage:true});await expectViewportSafe(page)})
  test(`visual pdp ${width}`,async({page})=>{await page.setViewportSize({width,height});await mockApi(page);await page.goto('/product/'+seedCatalog.products[0].slug);await waitStore(page);await revealForScreenshot(page);await page.screenshot({path:`qa-screenshots/pdp-${width}.png`,fullPage:true});await expectViewportSafe(page)})
}
