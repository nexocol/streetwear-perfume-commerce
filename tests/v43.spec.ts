import { test, expect, type Page, type Route } from '@playwright/test'
import { seedCatalog } from '../src/data/seed'

async function mockApi(page:Page){
  await page.route('**/api/**',async(route:Route)=>{
    const req=route.request();const path=new URL(req.url()).pathname
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
async function waitReady(page:Page){await expect(page.locator('.hero,.shop-hero,.pdp,.admin-page').first()).toBeVisible()}
async function settle(page:Page){
  await page.evaluate(async()=>{const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));for(let y=0;y<document.documentElement.scrollHeight;y+=Math.max(300,innerHeight*.6)){scrollTo(0,y);await sleep(70)}document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el=>el.classList.add('visible'));scrollTo(0,0)})
  await page.waitForTimeout(250)
}
async function expectSafe(page:Page){
  const root=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,x:scrollX}));expect(root.sw).toBeLessThanOrEqual(root.iw+1)
  const clipped=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('h1,h2,h3,p')].filter(el=>{const r=el.getBoundingClientRect();return el.getClientRects().length>0&&(r.left<-1||r.right>innerWidth+1)}).slice(0,8).map(el=>({text:(el.textContent||'').trim().slice(0,60),left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right})))
  expect(clipped).toEqual([])
}
async function assertNoLegacyNames(page:Page){
  const body=(await page.locator('body').innerText()).toUpperCase()
  for(const legacy of ['DENIM / 001','DENIM / 002','TEE / 001','SET / 001','FRAGRANCE / 001','FRAGRANCE / 002'])expect(body).not.toContain(legacy)
}

test('V4.3 catalog content and buyer journey',async({page})=>{
  await mockApi(page);await page.goto('/');await waitReady(page);await assertNoLegacyNames(page)
  await expect(page.getByText(/Pantalones, camisetas, conjuntos y perfumes/i)).toBeVisible()
  await page.getByRole('link',{name:/VER LA COLECCIÓN/}).click();await expect(page.locator('.shop-hero')).toBeVisible();await assertNoLegacyNames(page)
  await page.getByRole('button',{name:/FILTRAR / ORDENAR/}).click()
  await expect(page.getByText('ESTILO / SUBTIPO')).toBeVisible()
  await page.getByRole('button',{name:'Rotos',exact:true}).click()
  await page.getByRole('button',{name:/VER 1 PRODUCTOS/}).click()
  await expect(page.locator('.catalog .card')).toHaveCount(1)
  await page.locator('.catalog .media').first().click();await expect(page.locator('.pdp-info')).toBeVisible()
  await expect(page.getByText('Rotos',{exact:true}).first()).toBeVisible()
  await expect(page.getByText('ENVÍOS Y MÉTODOS DE PAGO')).toBeVisible()
})

test('V4.3 perfume info structure',async({page})=>{
  await mockApi(page);await page.goto('/product/'+seedCatalog.products.find(p=>p.category==='Perfumes')!.slug);await waitReady(page);await assertNoLegacyNames(page)
  await expect(page.getByText('COMPOSICIÓN / NOTAS')).toBeVisible()
  await expect(page.getByText('NOTAS PRINCIPALES')).toBeVisible()
  await expect(page.getByText('FAMILIA OLFATIVA')).toBeVisible()
  await expect(page.getByText('Por confirmar').first()).toBeVisible()
})

test('V4.3 exact shipping and payment terms',async({page})=>{
  await mockApi(page);await page.goto('/');await waitReady(page)
  await page.getByRole('button',{name:/ENVÍOS Y PAGOS/}).click()
  await expect(page.getByText('PAGO CONTRA ENTREGA')).toBeVisible()
  await expect(page.getByText('Pagas el valor de tu producto al recibirlo, pero el valor del envío se debe pagar por anticipado.')).toBeVisible()
  await expect(page.getByText('$15.000')).toBeVisible();await expect(page.getByText('$22.000')).toBeVisible();await expect(page.getByText('$30.000')).toBeVisible()
  await expect(page.getByText('Valor total = valor de la prenda + $10.000 de envío.')).toBeVisible()
  await expect(page.getByText('Para apartar tu prenda debes realizar un anticipo de $10.000. Este valor se descuenta del costo total de la prenda. No se cobra costo de envío.')).toBeVisible()
})

test('V4.3 CMS remains editable without infrastructure changes',async({page})=>{
  await mockApi(page);await page.goto('/admin/products/'+seedCatalog.products[0].id);await waitReady(page)
  await expect(page.getByLabel('Nombre')).toHaveValue('Pantalón — referencia por confirmar')
  await expect(page.getByLabel('Descripción breve')).toBeVisible()
  await expect(page.getByLabel('Categoría')).toBeVisible()
  await expect(page.getByLabel('Estilo / subtipo')).toBeVisible()
  await expect(page.getByLabel('Precio')).toBeVisible()
  await expect(page.getByText('MEDIA')).toBeVisible()
  await page.goto('/admin/products/'+seedCatalog.products.find(p=>p.category==='Perfumes')!.id);await waitReady(page)
  await expect(page.getByLabel('Composición / notas principales')).toBeVisible()
  await page.goto('/admin/settings');await waitReady(page)
  await expect(page.getByRole('heading',{name:'ENVÍOS Y MÉTODOS DE PAGO'})).toBeVisible()
  await expect(page.getByLabel('Bogotá')).toHaveValue('15000')
  await expect(page.getByLabel('Cundinamarca')).toHaveValue('22000')
  await expect(page.getByLabel('Resto del país')).toHaveValue('30000')
})

for(const [width,height] of [[1440,1000],[1024,900],[768,1024],[430,900],[390,844]]){
  test('V4.3 responsive '+width,async({page})=>{
    await page.setViewportSize({width,height});await mockApi(page);await page.goto('/');await waitReady(page);await settle(page);await assertNoLegacyNames(page);await expectSafe(page)
    await page.goto('/shop');await waitReady(page);await expectSafe(page)
    await page.goto('/product/'+seedCatalog.products[0].slug);await waitReady(page);await expectSafe(page)
  })
}

test('V4.3 requested screenshots',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await mockApi(page)
  await page.goto('/');await waitReady(page);await settle(page);await page.screenshot({path:'qa-v43/home.png',fullPage:true})
  await page.goto('/shop');await waitReady(page);await settle(page);await page.screenshot({path:'qa-v43/shop.png',fullPage:true})
  await page.goto('/product/'+seedCatalog.products.find(p=>p.category==='Jeans')!.slug);await waitReady(page);await settle(page);await page.screenshot({path:'qa-v43/pdp-pantalon.png',fullPage:true})
  await page.goto('/product/'+seedCatalog.products.find(p=>p.category==='Perfumes')!.slug);await waitReady(page);await settle(page);await page.screenshot({path:'qa-v43/pdp-perfume.png',fullPage:true})
  await page.goto('/');await waitReady(page);await page.getByRole('button',{name:/ENVÍOS Y PAGOS/}).click();await page.screenshot({path:'qa-v43/envios-pagos.png'})
})
