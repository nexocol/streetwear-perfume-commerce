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
    if(path.startsWith('/api/admin/products/')&&req.method()==='PUT'){
      const body=JSON.parse(req.postData()||'{}');return route.fulfill({json:body.product})
    }
    return route.continue()
  })
}
async function waitStore(page:Page){await expect(page.locator('.hero, .shop-hero, .pdp, .admin-page').first()).toBeVisible()}
async function revealForScreenshot(page:Page){
  await page.evaluate(async()=>{
    const max=document.documentElement.scrollHeight-window.innerHeight
    for(let y=0;y<=max;y+=Math.max(420,window.innerHeight*.65)){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,45))}
    window.scrollTo(0,max);await new Promise(r=>setTimeout(r,100));window.scrollTo(0,0)
  })
  await page.waitForTimeout(350)
}

test('storefront critical journey',async({page})=>{
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
  await page.locator('.sizes button').first().click()
  await page.getByRole('button',{name:'AGREGAR AL CARRITO'}).click()
  await expect(page.locator('.cart-item')).toHaveCount(1)
  await page.locator('.quantity button').last().click();await expect(page.locator('.quantity span')).toHaveText('2')
  await page.locator('.quantity button').first().click();await expect(page.locator('.quantity span')).toHaveText('1')
  await page.getByRole('button',{name:'ELIMINAR'}).click();await expect(page.locator('.cart-item')).toHaveCount(0)
  await page.getByRole('link',{name:/VER LA TIENDA/}).click();await expect(page.locator('.shop-hero')).toBeVisible()
  await page.goBack();await expect(page.locator('.pdp-info')).toBeVisible()
  await page.goto('/#fragrance');await expect(page.locator('#fragrance')).toBeVisible()
  await page.goto('/#editorial');await expect(page.locator('#editorial')).toBeVisible()
})

test('admin primary operations',async({page})=>{
  await mockApi(page);await page.goto('/admin/home');await expect(page.getByRole('heading',{name:'HOME.'})).toBeVisible()
  const headline=page.getByLabel('Titular');await headline.fill('DROP / 001\nQA')
  await expect(page.locator('.admin-savebar')).toHaveClass(/visible/)
  await page.locator('.admin-savebar').getByRole('button',{name:'GUARDAR CAMBIOS'}).click()
  await expect(page.getByText('Cambios guardados correctamente.')).toBeVisible()
  const editorialInput=page.locator('.editorial-media-picker input[type=file]')
  await editorialInput.setInputFiles({name:'editorial.jpg',mimeType:'image/jpeg',buffer:Buffer.from('qa')})
  await page.goto('/admin/products')
  await expect(page.locator('.admin-product-list article')).toHaveCount(6)
  await page.locator('.admin-product-list article').first().getByRole('link',{name:'EDITAR'}).click()
  await page.getByLabel('Subtítulo').fill('QA subtitle')
  await page.getByRole('button',{name:'GUARDAR',exact:true}).click()
  await expect(page.getByRole('button',{name:/GUARDADO/})).toBeVisible()
  await page.goto('/admin/products')
  await page.locator('.admin-product-list article').first().getByRole('button',{name:'DUPLICAR'}).click()
  await page.locator('.admin-product-list article').first().getByRole('button',{name:'OCULTAR'}).click()
})

for(const [width,height] of [[1440,1000],[1024,900],[768,1024],[430,900],[390,844]]){
  test('visual home '+width,async({page})=>{
    await page.setViewportSize({width,height});await mockApi(page);await page.goto('/');await waitStore(page);await revealForScreenshot(page)
    await page.screenshot({path:'qa-screenshots/home-'+width+'.png',fullPage:true})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy()
  })
}
for(const [width,height] of [[1440,1000],[768,1024],[430,900]]){
  test('visual admin '+width,async({page})=>{
    await page.setViewportSize({width,height});await mockApi(page);await page.goto('/admin/home');await expect(page.getByRole('heading',{name:'HOME.'})).toBeVisible();await page.waitForTimeout(450)
    await page.screenshot({path:'qa-screenshots/admin-'+width+'.png',fullPage:true})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy()
  })
}
