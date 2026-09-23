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
const MEDIA_SELECTOR='.hero-main-frame img,.hero-secondary img,.featured-rail .card img,.category-stage img,.fragrance img,.editorial-image img,.catalog-grid .card img,.gallery img,.related-grid .card img'
const FALLBACK_SELECTOR='.hero-main-frame .image-fallback,.hero-secondary .image-fallback,.featured-rail .image-fallback,.category-stage .image-fallback,.fragrance .image-fallback,.editorial-image .image-fallback,.catalog-grid .image-fallback,.gallery .image-fallback,.related-grid .image-fallback'

async function prepareVisualEvidence(page:Page){
  await page.evaluate(async()=>{
    const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))
    const step=Math.max(280,Math.floor(window.innerHeight*.55))
    let max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight)
    for(let y=0;y<=max;y+=step){
      window.scrollTo(0,y)
      await sleep(120)
      max=Math.max(max,document.documentElement.scrollHeight-window.innerHeight)
    }
    window.scrollTo(0,document.documentElement.scrollHeight)
    await sleep(320)
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el=>el.classList.add('visible'))
  })
  await page.waitForFunction((selector)=>{
    const imgs=[...document.querySelectorAll<HTMLImageElement>(selector as string)]
    return imgs.length>0&&imgs.every(img=>img.complete)
  },MEDIA_SELECTOR,{timeout:12_000})
  const report=await page.evaluate(({mediaSelector,fallbackSelector})=>{
    const imgs=[...document.querySelectorAll<HTMLImageElement>(mediaSelector)]
    const broken=imgs.filter(img=>!img.complete||img.naturalWidth<=0).map(img=>({src:img.currentSrc||img.src,complete:img.complete,naturalWidth:img.naturalWidth,alt:img.alt}))
    const fallbacks=[...document.querySelectorAll<HTMLElement>(fallbackSelector)].map(el=>({kind:el.dataset.imageFallback||'unmarked',src:el.dataset.failedSrc||'',label:el.getAttribute('aria-label')||''}))
    return {total:imgs.length,broken,fallbacks}
  },{mediaSelector:MEDIA_SELECTOR,fallbackSelector:FALLBACK_SELECTOR})
  expect(report.total,'Expected catalog media elements in visual QA').toBeGreaterThan(0)
  expect(report.broken,'Unresolved or broken catalog <img> media').toEqual([])
  expect(report.fallbacks,'Catalog media fell back after a real image error or missing media').toEqual([])
  console.log('MEDIA_QA '+JSON.stringify({url:page.url(),total:report.total,broken:report.broken.length,fallbacks:report.fallbacks.length}))
  await page.evaluate(()=>window.scrollTo(0,0))
  await page.waitForTimeout(250)
  return report
}
async function screenshotViewport(page:Page,path:string,_width:number){await page.screenshot({path,fullPage:true})}
async function expectViewportSafe(page:Page){
  const overflow=await page.evaluate(()=>{const w=innerWidth;return [...document.querySelectorAll<HTMLElement>('main *,.footer *')].filter(el=>{const s=getComputedStyle(el);const r=el.getBoundingClientRect();return el.getClientRects().length>0&&s.display!=='none'&&s.visibility!=='hidden'&&!el.closest('dialog:not([open])')&&el.tagName!=='BR'&&(r.left < -1 || r.right>w+1)&&!el.closest('.ticker,.featured-rail,.gallery')}).slice(0,10).map(el=>({el:el.className||el.tagName,left:Math.round(el.getBoundingClientRect().left),right:Math.round(el.getBoundingClientRect().right),text:(el.textContent||'').trim().slice(0,40)}))});expect(overflow).toEqual([])
  const rootScroll=await page.evaluate(()=>{window.scrollTo(9999,0);const x=window.scrollX;window.scrollTo(0,0);return x});expect(rootScroll).toBeLessThanOrEqual(1);const clipped=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('h1,h2')].filter(el=>{
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
  test(`visual home ${width}`,async({page})=>{await page.setViewportSize({width,height});await mockApi(page);await page.goto('/');await waitStore(page);await prepareVisualEvidence(page);await screenshotViewport(page,`qa-screenshots/home-${width}.png`,width);await expectViewportSafe(page)})
}
for(const [width,height] of [[1440,1000],[430,900]]){
  test(`visual shop ${width}`,async({page})=>{await page.setViewportSize({width,height});await mockApi(page);await page.goto('/shop');await waitStore(page);await prepareVisualEvidence(page);await screenshotViewport(page,`qa-screenshots/shop-${width}.png`,width);await expectViewportSafe(page)})
  test(`visual pdp ${width}`,async({page})=>{await page.setViewportSize({width,height});await mockApi(page);await page.goto('/product/'+seedCatalog.products[0].slug);await waitStore(page);await prepareVisualEvidence(page);await screenshotViewport(page,`qa-screenshots/pdp-${width}.png`,width);await expectViewportSafe(page)})
}

for(const [width,height] of [[430,900],[390,844]]){
  test(`visual shop filters open ${width}`,async({page})=>{
    await page.setViewportSize({width,height});await mockApi(page);await page.goto('/shop');await waitStore(page)
    await page.getByRole('button',{name:/FILTRAR \/ ORDENAR/}).click()
    await page.waitForTimeout(320)
    const panel=page.locator('.filter-panel')
    await expect(panel).toHaveClass(/open/)
    const clear=page.getByRole('button',{name:'LIMPIAR',exact:true})
    const apply=page.getByRole('button',{name:/VER \d+ PRODUCTOS/})
    await expect(clear).toBeVisible();await expect(apply).toBeVisible();await expect(clear).toBeInViewport();await expect(apply).toBeInViewport()
    const computed=await page.locator('.filter-actions').evaluate(el=>{
      const parent=getComputedStyle(el)
      const buttons=[...el.querySelectorAll<HTMLButtonElement>('button')].map(button=>{
        const style=getComputedStyle(button);const rect=button.getBoundingClientRect()
        return {text:button.textContent?.trim()||'',color:style.color,fontSize:style.fontSize,lineHeight:style.lineHeight,overflow:style.overflow,height:Math.round(rect.height),width:Math.round(rect.width),clientWidth:button.clientWidth,scrollWidth:button.scrollWidth,clientHeight:button.clientHeight,scrollHeight:button.scrollHeight}
      })
      return {position:parent.position,zIndex:parent.zIndex,bottom:parent.bottom,buttons}
    })
    console.log(`FILTER_ACTIONS_${width} ${JSON.stringify(computed)}`)
    expect(computed.position).toBe('sticky')
    expect(Number.parseInt(computed.zIndex)||0).toBeGreaterThan(0)
    for(const button of computed.buttons){
      expect(button.text.length).toBeGreaterThan(0)
      expect(Number.parseFloat(button.fontSize)).toBeGreaterThanOrEqual(10)
      expect(button.lineHeight).not.toBe('0px')
      expect(button.height).toBeGreaterThanOrEqual(42)
      expect(button.width).toBeGreaterThan(0)
      expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth+1)
      expect(button.scrollHeight).toBeLessThanOrEqual(button.clientHeight+1)
      expect(button.color).not.toBe('rgba(0, 0, 0, 0)')
    }
    await page.screenshot({path:`qa-screenshots/shop-filter-open-${width}.png`})
    await clear.click();await expect(panel).toHaveClass(/open/);await apply.click();await expect(panel).not.toHaveClass(/open/)
  })
}


async function settleSection(page:Page,selector:string){
  const section=page.locator(selector)
  await section.scrollIntoViewIfNeeded()
  await page.waitForTimeout(450)
  await page.evaluate(()=>document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el=>el.classList.add('visible')))
  await page.waitForTimeout(120)
  return section
}

test('V4.2 micro polish geometry and trust affordance',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/');await waitStore(page);await prepareVisualEvidence(page)
  const heading=page.locator('.collections-heading h2');const stage=page.locator('.category-stage')
  const [h,s]=await Promise.all([heading.boundingBox(),stage.boundingBox()])
  expect(h&&s&&h.x+h.width<=s.x+1,'Categories headline must not intrude into image stage').toBeTruthy()
  const bridge=page.locator('.editorial-title-bridge');await bridge.scrollIntoViewIfNeeded();await expect(bridge).toBeVisible()
  const trust=page.locator('.trust-rail button').first();await trust.scrollIntoViewIfNeeded();await trust.hover();await page.waitForTimeout(250)
  const view=trust.locator('.trust-view');await expect(view).toBeVisible();expect(Number(await view.evaluate(el=>getComputedStyle(el).opacity))).toBeGreaterThan(.9)

  await page.setViewportSize({width:430,height:900});await page.goto('/');await waitStore(page);await prepareVisualEvidence(page)
  const mobileTrust=page.locator('.trust-rail button').first();await mobileTrust.scrollIntoViewIfNeeded();await expect(mobileTrust.locator('.trust-arrow')).toBeVisible()
})

test('V4.2 comparison evidence',async({page})=>{
  const prod='https://streetwear-perfume-commerce.nexocolmj.workers.dev/'
  await page.setViewportSize({width:1440,height:1000})
  await page.goto(prod,{waitUntil:'networkidle'});await waitStore(page)
  for(const [name,selector] of [['categories','.collections'],['fragrance','.fragrance'],['editorial','.editorial'],['trust-desktop','.trust-rail']] as const){
    const section=await settleSection(page,selector);await section.screenshot({path:`qa-screenshots/v42-${name}-before.png`})
  }
  await mockApi(page);await page.goto('/');await waitStore(page);await prepareVisualEvidence(page)
  for(const [name,selector] of [['categories','.collections'],['fragrance','.fragrance'],['editorial','.editorial']] as const){
    const section=await settleSection(page,selector);await section.screenshot({path:`qa-screenshots/v42-${name}-after.png`})
  }
  const trust=await settleSection(page,'.trust-rail');await trust.locator('button').first().hover();await page.waitForTimeout(250);await trust.screenshot({path:'qa-screenshots/v42-trust-desktop-after-hover.png'})

  await page.setViewportSize({width:430,height:900});await page.unroute('**/api/**');await page.goto(prod,{waitUntil:'networkidle'});await waitStore(page)
  let mobileTrust=await settleSection(page,'.trust-rail');await mobileTrust.screenshot({path:'qa-screenshots/v42-trust-mobile-before.png'})
  await mockApi(page);await page.goto('/');await waitStore(page);await prepareVisualEvidence(page);mobileTrust=await settleSection(page,'.trust-rail');await mobileTrust.screenshot({path:'qa-screenshots/v42-trust-mobile-after.png'})
})
