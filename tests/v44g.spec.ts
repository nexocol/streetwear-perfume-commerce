import { test, expect, type Page, type Route } from '@playwright/test'
import { seedCatalog } from '../src/data/seed'
import type { CatalogSnapshot, Product } from '../src/types'

// Verified content for the two EL PUNTO perfumes (mirrors scripts/sql/v44g-perfumes-content.sql).
const VALENTINO={
  id:'perfume-01',name:'Valentino Donna Born in Roma Eau de Parfum',subtitle:'Eau de Parfum',fragranceFamily:'Ámbar floral',
  description:'Fragancia ámbar floral que combina la luminosidad del jazmín Sambac con el carácter amaderado y especiado del cashmeran y un fondo cálido de vainilla Bourbon.',
  features:['Salida: Jazmín Sambac','Corazón: Cashmeran','Fondo: Vainilla Bourbon']
}
const LATTAFA={
  id:'perfume-02',name:'Lattafa Badee Al Oud Noble Blush',subtitle:'Eau de Parfum',fragranceFamily:'Floral frutal gourmand',
  description:'Fragancia dulce y cremosa que abre con leche de rosas, continúa con almendra y merengue y termina sobre una base cálida de sándalo, vainilla y almizcle.',
  features:['Salida: Leche de rosas','Corazón: Almendra · Merengue','Fondo: Sándalo · Vainilla · Almizcle']
}

function verifiedCatalog():CatalogSnapshot{
  const c=structuredClone(seedCatalog)
  c.products=c.products.map(p=>{
    const v=[VALENTINO,LATTAFA].find(x=>x.id===p.id)
    if(!v)return {...p,price:100000,variants:p.variants.map(x=>({...x,stock:10}))}
    return {...p,...v,slug:p.slug,nameStatus:'confirmed',price:100000,variants:p.variants.map(x=>({...x,stock:10}))} as Product
  })
  return c
}
const slug=(id:string)=>seedCatalog.products.find(p=>p.id===id)!.slug

async function mockApi(page:Page,catalog:CatalogSnapshot,puts:any[]=[]){
  await page.route('**/api/**',async(route:Route)=>{
    const req=route.request();const path=new URL(req.url()).pathname
    if(path==='/api/catalog'||path==='/api/admin/catalog')return route.fulfill({json:catalog})
    if(path==='/api/admin/session')return route.fulfill({json:{email:'qa@nexo.local'}})
    if(path.startsWith('/api/admin/products/')&&req.method()==='PUT'){const body=JSON.parse(req.postData()||'{}');puts.push(body);return route.fulfill({json:body.product})}
    return route.continue()
  })
  // Drive images are irrelevant here and would slow the run down.
  await page.route(/googleusercontent\.com/,r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="12"/>'}))
}

test.describe('V4.4G perfume content on the PDP',()=>{
  for(const v of [VALENTINO,LATTAFA]){
    test(`PDP ${v.name}: name, subtitle, price, family, notes, description, single variant`,async({page})=>{
      await mockApi(page,verifiedCatalog())
      await page.goto('/product/'+slug(v.id))
      await expect(page.locator('.pdp-info h1')).toHaveText(v.name)
      await expect(page.locator('.pdp-info .subtitle')).toHaveText('Eau de Parfum')
      await expect(page.locator('.pdp-info .price')).toHaveText(/^\$\s*100\.000$/)
      const profile=page.locator('.perfume-profile')
      await expect(profile.locator('div',{hasText:'FAMILIA OLFATIVA'}).locator('b')).toHaveText(v.fragranceFamily)
      await expect(profile.locator('li')).toHaveText(v.features)
      await expect(profile.locator('p')).toHaveText(v.description)
      await expect(page.locator('.sizes button')).toHaveText(['Única'])
      await expect(page.locator('.add-button')).toBeEnabled()
      await expect(page.locator('.product-facts')).toContainText('DISPONIBLE')
      await expect(page.locator('.pdp-info')).not.toContainText('Por confirmar FAMILIA')
    })
  }

  test('NULL fragranceFamily falls back to "Por confirmar"',async({page})=>{
    const c=verifiedCatalog();c.products.find(p=>p.id==='perfume-01')!.fragranceFamily=null
    await mockApi(page,c)
    await page.goto('/product/'+slug('perfume-01'))
    await expect(page.locator('.perfume-profile div',{hasText:'FAMILIA OLFATIVA'}).locator('b')).toHaveText('Por confirmar')
  })

  test('non-perfume PDPs are unaffected (no perfume section, no family)',async({page})=>{
    await mockApi(page,verifiedCatalog())
    const denim=seedCatalog.products.find(p=>p.category==='Jeans')!
    await page.goto('/product/'+denim.slug)
    await expect(page.locator('.pdp-info h1')).toBeVisible()
    await expect(page.locator('.perfume-profile')).toHaveCount(0)
    await expect(page.locator('.pdp-info')).not.toContainText('FAMILIA OLFATIVA')
    await expect(page.locator('summary',{hasText:'DETALLES DEL PRODUCTO'})).toBeVisible()
  })

  test('catalog fixture: verified names never contain invented data (no oud / no duration claims)',()=>{
    const all=[VALENTINO,LATTAFA].map(v=>[v.name,v.subtitle,v.description,v.fragranceFamily,...v.features].join(' ').toLowerCase())
    // "Oud" is part of the collection name only; the official Noble Blush pyramid has no oud note.
    expect([LATTAFA.description,LATTAFA.fragranceFamily,...LATTAFA.features].join(' ').toLowerCase()).not.toMatch(/\boud\b/)
    for(const t of all)expect(t).not.toMatch(/horas|duraci|proyecci|invierno|verano|noche|oficina|primavera|otoño/)
    expect(VALENTINO.features.join(' ')).not.toMatch(/bergamota/i)
  })
})

test.describe('V4.4G search',()=>{
  const cases:[string,string[]][]=[['valentino',['perfume-01']],['born in roma',['perfume-01']],['lattafa',['perfume-02']],['noble blush',['perfume-02']],['perfume',['perfume-01','perfume-02']]]
  for(const [q,ids] of cases){
    test(`overlay + shop search "${q}"`,async({page})=>{
      await mockApi(page,verifiedCatalog())
      await page.goto('/')
      await page.getByRole('button',{name:'Buscar'}).first().click()
      await page.getByLabel('Buscar productos').fill(q)
      const hrefs=await page.locator('.search-results a').evaluateAll(a=>a.map(x=>x.getAttribute('href')))
      expect(hrefs.sort()).toEqual(ids.map(id=>'/product/'+slug(id)).sort())
      await page.goto('/shop?q='+encodeURIComponent(q))
      const shopHrefs=await page.locator('.card .media').evaluateAll(a=>a.map(x=>x.getAttribute('href')))
      expect(shopHrefs.sort()).toEqual(ids.map(id=>'/product/'+slug(id)).sort())
    })
  }
})

test.describe('V4.4G CMS field',()=>{
  test('perfume shows "Familia olfativa"; edit persists it; other edits preserve it',async({page})=>{
    const puts:any[]=[]
    await mockApi(page,verifiedCatalog(),puts)
    await page.goto('/admin/products/perfume-01')
    const field=page.getByLabel('Familia olfativa')
    await expect(field).toHaveValue('Ámbar floral')
    // editing something else keeps the family in the payload
    await page.getByLabel('Subtítulo').fill('Eau de Parfum 100 ml')
    await page.getByRole('button',{name:'GUARDAR'}).first().click()
    await expect.poll(()=>puts.length).toBe(1)
    expect(puts[0].product.fragranceFamily).toBe('Ámbar floral')
    expect(puts[0].product.price).toBe(100000)
    expect(puts[0].product.status).toBe('active')
    expect(puts[0].product.variants).toHaveLength(1)
    // editing the family persists the new value; empty -> null
    await field.fill('Ámbar floral / vainilla')
    await page.getByRole('button',{name:'GUARDAR'}).first().click()
    await expect.poll(()=>puts.length).toBe(2)
    expect(puts[1].product.fragranceFamily).toBe('Ámbar floral / vainilla')
    await field.fill('')
    await page.getByRole('button',{name:'GUARDAR'}).first().click()
    await expect.poll(()=>puts.length).toBe(3)
    expect(puts[2].product.fragranceFamily).toBeNull()
  })

  test('non-perfume products do not show the field and keep it null',async({page})=>{
    const puts:any[]=[]
    await mockApi(page,verifiedCatalog(),puts)
    await page.goto('/admin/products/'+seedCatalog.products.find(p=>p.category==='Jeans')!.id)
    await expect(page.getByLabel('Nombre')).toBeVisible()
    await expect(page.getByLabel('Familia olfativa')).toHaveCount(0)
    await page.getByLabel('Subtítulo').fill('x')
    await page.getByRole('button',{name:'GUARDAR'}).first().click()
    await expect.poll(()=>puts.length).toBe(1)
    expect(puts[0].product.fragranceFamily).toBeNull()
  })

  test('changing category to Perfumes reveals the field',async({page})=>{
    await mockApi(page,verifiedCatalog())
    await page.goto('/admin/products/'+seedCatalog.products.find(p=>p.category==='Jeans')!.id)
    await expect(page.getByLabel('Familia olfativa')).toHaveCount(0)
    await page.getByLabel('Categoría').selectOption({label:'Perfumes'})
    await expect(page.getByLabel('Familia olfativa')).toBeVisible()
  })
})

// ---------- responsive: long perfume names ----------
const WIDTHS=[1440,1280,1024,768,430,390]
const docOverflow=(page:Page)=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)
const inViewport=(page:Page,sel:string)=>page.locator(sel).first().evaluate((el:Element)=>{el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();return r.left>=-0.5&&r.right<=innerWidth+0.5&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight})

test.describe('V4.4G responsive with long perfume names',()=>{
  for(const w of WIDTHS){
    for(const v of [VALENTINO,LATTAFA]){
      test(`PDP ${v.id} @${w}`,async({page})=>{
        await page.setViewportSize({width:w,height:900})
        await mockApi(page,verifiedCatalog())
        await page.goto('/product/'+slug(v.id))
        await expect(page.locator('.pdp-info h1')).toHaveText(v.name)
        expect(await docOverflow(page)).toBeLessThanOrEqual(0)
        const h1=await page.locator('.pdp-info h1').evaluate(el=>{
          const cs=getComputedStyle(el),r=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el)
          const tr=range.getBoundingClientRect(),parent=el.parentElement!.getBoundingClientRect()
          return {clipX:el.scrollWidth>el.clientWidth+1,overflow:cs.overflow,textRight:tr.right,boxRight:r.right,parentRight:parent.right,vw:innerWidth,lines:Math.round(r.height/parseFloat(cs.lineHeight))}
        })
        expect(h1.clipX,'h1 clipped horizontally').toBe(false)
        expect(h1.overflow,'h1 must not hide its text').toBe('visible')
        expect(h1.textRight).toBeLessThanOrEqual(h1.parentRight+1)
        expect(h1.textRight).toBeLessThanOrEqual(h1.vw)
        for(const sel of ['.pdp-info .price','.perfume-profile b','.perfume-profile li','.pdp-info .subtitle','.add-button','.sizes button'])expect(await inViewport(page,sel),sel+' inside viewport').toBe(true)
        await expect(page.locator('.perfume-profile b')).toHaveText(v.fragranceFamily)
        await expect(page.locator('.add-button')).toBeEnabled()
        // add-to-cart still works
        await page.locator('.add-button').click()
        await expect(page.locator('[data-testid=cart-size]')).toBeVisible()
        expect(await docOverflow(page)).toBeLessThanOrEqual(0)
      })
    }

    test(`cards Shop/Search/Home @${w}`,async({page})=>{
      await page.setViewportSize({width:w,height:900})
      await mockApi(page,verifiedCatalog())
      await page.goto('/shop')
      await page.locator('.card').first().waitFor()
      expect(await docOverflow(page),'shop overflow').toBeLessThanOrEqual(0)
      for(const id of ['perfume-01','perfume-02']){
        const card=page.locator('.card',{has:page.locator(`a[href="/product/${slug(id)}"]`)}).first()
        await card.scrollIntoViewIfNeeded()
        const g=await card.evaluate(el=>{
          const c=el.getBoundingClientRect(),h3=el.querySelector('h3')!,tr=(()=>{const r=document.createRange();r.selectNodeContents(h3);return r.getBoundingClientRect()})()
          const sub=el.querySelector('.meta p')!.getBoundingClientRect(),price=el.querySelector('.meta > b')!.getBoundingClientRect()
          return {h3Right:tr.right,cardRight:c.right,h3Clip:h3.scrollWidth>h3.clientWidth+1,subRight:sub.right,subBottom:sub.bottom,priceTop:price.top,priceRight:price.right,priceLeft:price.left,h3Bottom:tr.bottom,cardLeft:c.left}
        })
        expect(g.h3Right,id+' title inside card').toBeLessThanOrEqual(g.cardRight+1)
        expect(g.h3Clip).toBe(false)
        expect(g.priceRight).toBeLessThanOrEqual(g.cardRight+1)
        expect(g.subRight<=g.priceLeft+2||g.priceTop>=g.subBottom-1,'subtitle must not run under the price').toBe(true) // beside (desktop) or stacked (mobile)
      }
      // Search overlay
      await page.getByRole('button',{name:'Buscar'}).first().click()
      await page.getByLabel('Buscar productos').fill('perfume')
      await expect(page.locator('.search-results a')).toHaveCount(2)
      const rows=await page.locator('.search-results a').evaluateAll(as=>as.map(a=>{const s=a.querySelector('span')!.getBoundingClientRect(),r=a.getBoundingClientRect();return {right:s.right,rowRight:r.right,vw:innerWidth}}))
      for(const r of rows){expect(r.right).toBeLessThanOrEqual(r.rowRight+1);expect(r.right).toBeLessThanOrEqual(r.vw)}
      expect(await docOverflow(page),'search overflow').toBeLessThanOrEqual(0)
      // Home (fragrance section shows the long name)
      await page.goto('/')
      await page.locator('#fragrance').scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      expect(await docOverflow(page),'home overflow').toBeLessThanOrEqual(0)
      const obj=await page.locator('.fragrance-object span').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,vw:innerWidth,clip:el.scrollWidth>el.clientWidth+1}})
      expect(obj.right).toBeLessThanOrEqual(obj.vw+1)
      expect(obj.left).toBeGreaterThanOrEqual(-1)
    })
  }
})
