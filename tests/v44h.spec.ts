import { test, expect, type Page, type Route } from '@playwright/test'
import { seedCatalog } from '../src/data/seed'
import { DEFAULT_ADVISORY_COPY, DEFAULT_CHANGES_COPY, clientAdvisoryCopy, clientChangesCopy, displayProductSubtitle } from '../src/lib/clientContent'
import type { CatalogSnapshot, Product } from '../src/types'

// Production still stores the clothing-only copy in D1 site_settings; the client must map it (no D1 write in V4.4H).
const LEGACY_CHANGES='La prenda debe regresar sin uso, manchas, daños, modificaciones u olores, con etiquetas y elementos originales.'
const LEGACY_ADVISORY='Si estás entre dos tallas, compara las medidas con una prenda propia cuyo fit te guste antes de elegir.'
const LEGACY_SHIPPING='La cobertura, el costo y los tiempos de envío se confirmarán según el destino.'

const VALENTINO={id:'perfume-01',name:'Valentino Donna Born in Roma Eau de Parfum',subtitle:'Eau de Parfum',fragranceFamily:'Ámbar floral',description:'Fragancia ámbar floral.',features:['Salida: Jazmín Sambac','Corazón: Cashmeran','Fondo: Vainilla Bourbon']}
const LATTAFA={id:'perfume-02',name:'Lattafa Badee Al Oud Noble Blush',subtitle:'Eau de Parfum',fragranceFamily:'Floral frutal gourmand',description:'Fragancia dulce y cremosa.',features:['Salida: Leche de rosas','Corazón: Almendra · Merengue','Fondo: Sándalo · Vainilla · Almizcle']}

function apparel(id:string,name:string,category:string,categoryId:string,extra:Partial<Product>={}):Product{
  const base=structuredClone(seedCatalog.products.find(p=>p.id==='tee-01')!)
  return {...base,id,slug:id,name,nameStatus:'confirmed',subtitle:null,description:name+' de prueba.',category,categoryId,fit:null,color:null,price:100000,status:'active',features:[],
    variants:['S','M'].map((s,i)=>({id:`${id}-${s}`,productId:id,size:s,color:null,sku:null,price:null,stock:10,available:true,shopifyVariantId:null,sortOrder:i+1})),media:[],...extra}
}
function catalog(site:Partial<CatalogSnapshot['site']>={}):CatalogSnapshot{
  const c=structuredClone(seedCatalog)
  c.site={...c.site,changesCopy:LEGACY_CHANGES,advisoryCopy:LEGACY_ADVISORY,shippingCopy:LEGACY_SHIPPING,whatsapp:null,...site}
  c.products=c.products.map(p=>{
    const v=[VALENTINO,LATTAFA].find(x=>x.id===p.id)
    return v?{...p,...v,nameStatus:'confirmed',price:100000,variants:p.variants.map(x=>({...x,stock:10}))} as Product:p
  })
  c.products.push(
    apparel('qa-camiseta','Camiseta QA','Streetwear','cat-streetwear'),
    apparel('qa-sudadera','Sudadera QA','Sudaderas','cat-sudaderas'),
    apparel('qa-short','Short QA','Shorts','cat-shorts'),
    apparel('qa-pantalon','Pantalón QA','Jeans','cat-jeans'),
    apparel('qa-camiseta-detalles','Camiseta con detalles QA','Streetwear','cat-streetwear',{features:['Algodón pesado.']}),
  )
  return c
}
async function mockApi(page:Page,cat:CatalogSnapshot){
  await page.route('**/api/**',async(route:Route)=>{
    const path=new URL(route.request().url()).pathname
    if(path==='/api/catalog')return route.fulfill({json:cat})
    return route.continue()
  })
  await page.route(/googleusercontent\.com/,r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="12"/>'}))
}
const slug=(id:string)=>seedCatalog.products.find(p=>p.id===id)?.slug||id
const label=(page:Page)=>page.locator('.pdp-info > span').first()
const facts=(page:Page)=>page.locator('.product-facts > div')

test.describe('V4.4H apparel PDP without fit: no "Por confirmar"',()=>{
  for(const [id,upper,singular] of [['qa-camiseta','CAMISETAS','Camiseta'],['qa-sudadera','SUDADERAS','Sudadera'],['qa-short','SHORTS','Short'],['qa-pantalon','PANTALONES','Pantalón']] as const){
    test(`${id}: label ${upper}, fact PRODUCTO / ${singular}`,async({page})=>{
      await mockApi(page,catalog())
      await page.goto('/product/'+id)
      await expect(label(page)).toHaveText(upper)
      await expect(facts(page)).toHaveCount(2)
      await expect(facts(page).nth(0).locator('span')).toHaveText('PRODUCTO')
      await expect(facts(page).nth(0).locator('b')).toHaveText(singular)
      await expect(facts(page).nth(1).locator('span')).toHaveText('DISPONIBILIDAD')
      const info=page.locator('.pdp-info')
      for(const bad of ['ESTILO POR CONFIRMAR','ESTILO / FIT','ESTILO / SUBTIPO','Por confirmar','por confirmar'])await expect(info).not.toContainText(bad)
      // nothing real to list -> the details accordion is not rendered (no placeholder)
      await expect(page.locator('summary',{hasText:'DETALLES DEL PRODUCTO'})).toHaveCount(0)
      await expect(page.locator('summary',{hasText:'ENVÍOS Y MÉTODOS DE PAGO'})).toBeVisible()
    })
  }
  test('jeans without style: card + PDP subtitle is the category, not "Estilo por confirmar"',async({page})=>{
    const cat=catalog();const p=cat.products.find(x=>x.id==='qa-pantalon')!
    expect(displayProductSubtitle(p)).toBe('Pantalones')
    await mockApi(page,cat)
    await page.goto('/shop?cat=Jeans')
    await expect(page.locator('body')).not.toContainText(/Estilo por confirmar/i)
    await page.goto('/product/qa-pantalon')
    await expect(page.locator('.pdp-info .subtitle')).toHaveText('Pantalones')
  })
  test('apparel with features keeps the details accordion',async({page})=>{
    await mockApi(page,catalog())
    await page.goto('/product/qa-camiseta-detalles')
    await expect(page.locator('summary',{hasText:'DETALLES DEL PRODUCTO'})).toBeVisible()
    await expect(page.locator('.pdp-info details li')).toHaveText(['Algodón pesado.'])
    await expect(facts(page).nth(0).locator('span')).toHaveText('PRODUCTO')
  })
  test('denim-01 keeps ESTILO / SUBTIPO and its label',async({page})=>{
    await mockApi(page,catalog())
    await page.goto('/product/'+slug('denim-01'))
    await expect(facts(page).nth(0).locator('span')).toHaveText('ESTILO / SUBTIPO')
    await expect(facts(page).nth(0).locator('b')).toHaveText('Rotos')
    await expect(label(page)).toHaveText('Pantalones / Rotos')
    await expect(page.locator('summary',{hasText:'DETALLES DEL PRODUCTO'})).toBeVisible()
  })
  test('tee-01 with fit keeps ESTILO / FIT and its label',async({page})=>{
    await mockApi(page,catalog())
    await page.goto('/product/'+slug('tee-01'))
    await expect(facts(page).nth(0).locator('span')).toHaveText('ESTILO / FIT')
    await expect(facts(page).nth(0).locator('b')).toHaveText('Oversized')
    await expect(label(page)).toHaveText('Camisetas / Oversized')
  })
})

test.describe('V4.4H perfumes: family intact, trust rail without size guide, cart option',()=>{
  for(const v of [VALENTINO,LATTAFA]){
    test(`${v.id}: FAMILIA OLFATIVA intact, 3-card trust rail, cart OPCIÓN / Única`,async({page})=>{
      await mockApi(page,catalog())
      await page.goto('/product/'+slug(v.id))
      await expect(facts(page).nth(0).locator('span')).toHaveText('FAMILIA OLFATIVA')
      await expect(facts(page).nth(0).locator('b')).toHaveText(v.fragranceFamily)
      await expect(label(page)).toHaveText('PERFUMES / EAU DE PARFUM')
      const cards=page.locator('.trust-rail button b')
      await expect(cards).toHaveText(['CAMBIOS','ASESORÍA','ENVÍOS Y PAGOS'])
      await expect(page.locator('.trust-rail .trust-index')).toHaveText(['01','02','03'])
      await expect(page.locator('.trust-rail')).not.toContainText('GUÍA DE TALLAS')
      await expect(page.locator('.trust-rail')).toHaveClass(/trust-rail--3/)
      await page.locator('.add-button').click()
      await expect(page.locator('[data-testid=cart-size]')).toHaveText('OPCIÓN / Única')
      await expect(page.locator('.cart')).not.toContainText('TALLA / Única')
    })
  }
  test('apparel PDP + Home + Shop keep the 4-card trust rail (size guide included)',async({page})=>{
    await mockApi(page,catalog())
    for(const url of ['/product/'+slug('denim-01'),'/product/qa-camiseta','/','/shop']){
      await page.goto(url)
      await expect(page.locator('.trust-rail button b'),url).toHaveText(['GUÍA DE TALLAS','CAMBIOS','ASESORÍA','ENVÍOS Y PAGOS'])
      await expect(page.locator('.trust-rail .trust-index')).toHaveText(['01','02','03','04'])
      await expect(page.locator('.trust-rail')).not.toHaveClass(/trust-rail--3/)
    }
  })
  test('apparel cart keeps TALLA / S and COLOR',async({page})=>{
    await mockApi(page,catalog())
    await page.goto('/product/qa-camiseta')
    await page.locator('.sizes button',{hasText:/^S$/}).click()
    await page.locator('.add-button').click()
    await expect(page.locator('[data-testid=cart-size]')).toHaveText('TALLA / S')
  })
  test('the perfume PDP still opens CAMBIOS / ASESORÍA / ENVÍOS from the 3-card rail',async({page})=>{
    await mockApi(page,catalog())
    await page.goto('/product/'+slug('perfume-01'))
    await page.locator('.trust-rail button',{hasText:'CAMBIOS'}).click()
    await expect(page.locator('#service-dialog')).toContainText(DEFAULT_CHANGES_COPY)
    await page.keyboard.press('Escape')
    await page.locator('.trust-rail button',{hasText:'ASESORÍA'}).click()
    await expect(page.locator('#service-dialog')).toContainText(DEFAULT_ADVISORY_COPY)
    await page.keyboard.press('Escape')
    await page.locator('.trust-rail button',{hasText:'ENVÍOS Y PAGOS'}).click()
    await expect(page.locator('#service-dialog')).toContainText('PAGO CONTRA ENTREGA')
  })
})

test.describe('V4.4H copy',()=>{
  test('Home perfumes copy has no "cuando estén confirmados"',async({page})=>{
    await mockApi(page,catalog())
    await page.goto('/')
    const p=page.locator('.fragrance-copy p')
    await expect(p).toHaveText('Explora los perfumes disponibles y consulta en cada producto su composición, notas y perfil olfativo.')
    await expect(page.locator('body')).not.toContainText('cuando estén confirmados')
  })

  test('shipping: same amounts, "prenda" -> "producto"',async({page})=>{
    await mockApi(page,catalog())
    await page.goto('/')
    await page.locator('.trust-rail button',{hasText:'ENVÍOS Y PAGOS'}).click()
    const d=page.locator('#service-dialog')
    await expect(d).toContainText('Pagas el valor de tu producto al recibirlo, pero el valor del envío se debe pagar por anticipado.')
    await expect(d).toContainText('Valor total = valor del producto + $10.000 de envío.')
    await expect(d).toContainText('Para apartar tu producto debes realizar un anticipo de $10.000. Este valor se descuenta del costo total del producto. No se cobra costo de envío.')
    const rows=await d.locator('dl > div').evaluateAll(els=>els.map(e=>[...e.children].map(c=>c.textContent!.trim()).join(' ')))
    expect(rows).toEqual(['Bogotá $15.000','Cundinamarca $22.000','Resto del país $30.000','Envío $10.000','Costo de envío $0'])
    await expect(d).not.toContainText(/prenda/i)
  })

  test('changes + advice: legacy D1 copy is shown as the generic copy; CMS-edited copy is untouched',async({page})=>{
    await mockApi(page,catalog())
    await page.goto('/')
    await page.locator('.trust-rail button',{hasText:'CAMBIOS'}).click()
    await expect(page.locator('#service-dialog [data-service-content] p')).toHaveText('El producto debe regresar sin uso, manchas, daños, modificaciones u olores, con etiquetas y elementos originales.')
    await page.keyboard.press('Escape')
    await page.locator('.trust-rail button',{hasText:'ASESORÍA'}).click()
    await expect(page.locator('#service-dialog [data-service-content] p')).toHaveText('Si tienes dudas sobre talla, disponibilidad o características de un producto, consulta con nuestro equipo antes de realizar tu compra.')
    await expect(page.locator('#service-dialog a')).toHaveCount(0) // no whatsapp configured -> no CTA
    await page.close()
    const custom=catalog({changesCopy:'Política propia del cliente.',advisoryCopy:'Consejo propio.',whatsapp:'+57 300 000 0000'})
    const p2=await page.context().newPage();await mockApi(p2,custom);await p2.goto('/')
    await p2.locator('.trust-rail button',{hasText:'CAMBIOS'}).click()
    await expect(p2.locator('#service-dialog [data-service-content] p')).toHaveText('Política propia del cliente.')
    await p2.keyboard.press('Escape')
    await p2.locator('.trust-rail button',{hasText:'ASESORÍA'}).click()
    await expect(p2.locator('#service-dialog [data-service-content] p')).toHaveText('Consejo propio.')
    await expect(p2.locator('#service-dialog a')).toHaveAttribute('href','https://wa.me/573000000000')
  })

  test('copy helpers (pure): legacy -> generic, empty -> generic, custom kept',()=>{
    expect(clientChangesCopy(LEGACY_CHANGES)).toBe(DEFAULT_CHANGES_COPY)
    expect(clientChangesCopy(null)).toBe(DEFAULT_CHANGES_COPY)
    expect(clientChangesCopy('  ')).toBe(DEFAULT_CHANGES_COPY)
    expect(clientChangesCopy('Otra política')).toBe('Otra política')
    expect(clientAdvisoryCopy(LEGACY_ADVISORY)).toBe(DEFAULT_ADVISORY_COPY)
    expect(clientAdvisoryCopy(undefined)).toBe(DEFAULT_ADVISORY_COPY)
    expect(clientAdvisoryCopy('Otro consejo')).toBe('Otro consejo')
    expect(DEFAULT_CHANGES_COPY).not.toMatch(/prenda/i)
    expect(DEFAULT_ADVISORY_COPY).not.toMatch(/prenda/i)
  })
})

test.describe('V4.4H responsive',()=>{
  for(const w of [1440,1024,768,430,390]){
    test(`perfume PDP trust rail + apparel PDP @${w}`,async({page})=>{
      await page.setViewportSize({width:w,height:w<500?844:900})
      await mockApi(page,catalog())
      await page.goto('/product/'+slug('perfume-01'))
      await expect(page.locator('.pdp-info h1')).toBeVisible()
      const g=await page.locator('.trust-rail').evaluate(el=>{
        el.scrollIntoView({block:'center',behavior:'instant'})
        const r=el.getBoundingClientRect(),bs=[...el.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect();return {l:q.left,r:q.right,t:q.top,b:q.bottom,w:q.width}})
        return {ovf:document.documentElement.scrollWidth-innerWidth,railL:r.left,railR:r.right,vw:innerWidth,bs}
      })
      expect(g.ovf).toBeLessThanOrEqual(0)
      expect(g.bs).toHaveLength(3)
      if(w>=1025){ // one row, three equal cells that fill the rail
        expect(new Set(g.bs.map(b=>Math.round(b.t))).size).toBe(1)
        expect(Math.abs(g.bs[2].r-g.railR)).toBeLessThan(2)
        expect(Math.abs(g.bs[0].w-g.bs[1].w)).toBeLessThan(2)
      }else{ // 2 + 1: the third card spans the whole row
        expect(Math.round(g.bs[0].t)).toBe(Math.round(g.bs[1].t))
        expect(g.bs[2].t).toBeGreaterThan(g.bs[0].b-2)
        expect(Math.abs(g.bs[2].l-g.railL)).toBeLessThan(2)
        expect(Math.abs(g.bs[2].r-g.railR)).toBeLessThan(2)
      }
      for(const b of g.bs){expect(b.l).toBeGreaterThanOrEqual(-1);expect(b.r).toBeLessThanOrEqual(g.vw+1)}
      // apparel PDP: new label/fact fit without overflow
      await page.goto('/product/qa-camiseta');await expect(page.locator('.pdp-info h1')).toBeVisible()
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0)
      await expect(facts(page).nth(0)).toBeVisible()
    })
  }
})
