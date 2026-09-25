import { test, expect, type Page, type Route } from '@playwright/test'
import { seedCatalog } from '../src/data/seed'
import type { CatalogSnapshot, Product, Variant } from '../src/types'
import { productStyle } from '../src/lib/clientContent'

const LOGO='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="139" height="100" viewBox="0 0 139 100"><rect width="139" height="100" rx="40" fill="#0b0b0b"/><text x="70" y="58" font-size="26" fill="#fff" text-anchor="middle" font-family="sans-serif">EL PUNTO</text></svg>')

const variant=(productId:string,size:string,color:string|null,n:number,extra:Partial<Variant>={}):Variant=>({id:`${productId}-${size}${color?'-'+color.toLowerCase():''}`,productId,size,color,sku:null,price:null,stock:10,available:true,shopifyVariantId:null,sortOrder:n,...extra})
function product(id:string,name:string,variants:Variant[]):Product{
  const base=structuredClone(seedCatalog.products[0])
  return {...base,id,slug:id,name,nameStatus:'confirmed',subtitle:null,description:'Prueba V4.4D.',category:'Sudaderas',categoryId:base.categoryId,fit:null,color:null,price:100000,status:'active',features:[],variants,media:[]}
}
const nikeVariants=()=>['Gris','Amarillo'].flatMap((c,ci)=>['S','M','L','XL'].map((s,si)=>variant('qa-nike',s,c,ci*4+si+1)))
// Rojo has no XL and Verde is out of stock -> exercises "keep size only if it exists" and disabled colors
const partialVariants=()=>[
  ...['S','M','L','XL'].map((s,i)=>variant('qa-partial',s,'Blanco',i+1)),
  ...['S','M','L'].map((s,i)=>variant('qa-partial',s,'Rojo',i+5)),
  ...['S','M'].map((s,i)=>variant('qa-partial',s,'Verde',i+8,{stock:0}))
]
function catalog(logoUrl:string|null=LOGO):CatalogSnapshot{
  const c=structuredClone(seedCatalog)
  c.site={...c.site,brandName:'EL PUNTO',logoUrl}
  c.products=[...c.products,product('qa-nike','Sudadera Nike QA',nikeVariants()),product('qa-partial','Camiseta Parcial QA',partialVariants())]
  return c
}
async function mockApi(page:Page,cat:CatalogSnapshot,puts:any[]=[]){
  await page.route('**/api/**',async(route:Route)=>{
    const req=route.request();const path=new URL(req.url()).pathname
    if(path==='/api/catalog'||path==='/api/admin/catalog')return route.fulfill({json:cat})
    if(path==='/api/admin/session')return route.fulfill({json:{email:'qa@nexo.local'}})
    if(path.startsWith('/api/admin/products/')&&req.method()==='PUT'){const body=JSON.parse(req.postData()||'{}');puts.push(body);return route.fulfill({json:body.product})}
    if(path.startsWith('/api/site-media/missing'))return route.fulfill({status:404,body:'Not found'})
    return route.continue()
  })
}

test.describe('V4.4D variant color + size',()=>{
  test('PDP: color first, sizes filtered by color, exact variant reaches the cart',async({page})=>{
    await mockApi(page,catalog())
    await page.goto('/product/qa-nike')
    await expect(page.locator('.color-options button')).toHaveText(['Gris','Amarillo'])
    await expect(page.locator('.pdp-colors')).toContainText('Gris · Amarillo')
    await expect(page.locator('.sizes button')).toHaveText(['S','M','L','XL'])
    await expect(page.locator('[data-testid=selected-color]')).toHaveText('Gris')
    await expect(page.locator('.add-button')).toBeDisabled()
    await page.locator('.color-options button',{hasText:'Amarillo'}).click()
    await page.locator('.sizes button',{hasText:/^M$/}).click()
    await page.locator('.add-button').click()
    await expect(page.locator('[data-testid=cart-color]')).toHaveText('COLOR / Amarillo')
    await expect(page.locator('[data-testid=cart-size]')).toHaveText('TALLA / M')
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('streetwear.cart.v3')||'[]'))
    expect(stored).toHaveLength(1)
    expect(stored[0].variantId).toBe('qa-nike-M-amarillo')
  })

  test('PDP: size kept when it exists in the new color, cleared when it does not',async({page})=>{
    await mockApi(page,catalog())
    await page.goto('/product/qa-partial')
    await page.locator('.sizes button',{hasText:/^XL$/}).click()
    await expect(page.locator('.sizes button',{hasText:/^XL$/})).toHaveAttribute('aria-pressed','true')
    await page.locator('.color-options button',{hasText:'Rojo'}).click()
    await expect(page.locator('.sizes button')).toHaveText(['S','M','L'])
    await expect(page.locator('.add-button')).toBeDisabled()           // XL does not exist in Rojo -> cleared
    await page.locator('.sizes button',{hasText:/^L$/}).click()
    await page.locator('.color-options button',{hasText:'Blanco'}).click()
    await expect(page.locator('.sizes button',{hasText:/^L$/})).toHaveAttribute('aria-pressed','true') // L exists in Blanco -> kept
    await expect(page.locator('.add-button')).toBeEnabled()
    await expect(page.locator('.color-options button',{hasText:'Verde'})).toBeDisabled()               // no stock in any size
  })

  test('PDP: products without several colors keep the old size-only UX',async({page})=>{
    await mockApi(page,catalog())
    await page.goto('/product/'+seedCatalog.products.find(p=>p.variants.length>1)!.slug)
    await expect(page.locator('.color-options')).toHaveCount(0)
    await expect(page.locator('.pdp-colors')).toHaveCount(0)
    await page.locator('.sizes button').first().click()
    await page.locator('.add-button').click()
    await expect(page.locator('[data-testid=cart-size]')).toBeVisible()
    await expect(page.locator('[data-testid=cart-color]')).toHaveCount(0)
  })

  test('Shop quick-add exposes color and size for multi-color products',async({page})=>{
    await mockApi(page,catalog())
    await page.goto('/shop')
    const card=page.locator('article.card',{has:page.locator('h3',{hasText:'Sudadera Nike QA'})})
    await card.scrollIntoViewIfNeeded()
    await card.locator('.card-actions button').click()
    await expect(card.locator('.quick-colors button')).toHaveText(['Gris','Amarillo'])
    await card.locator('.quick-colors button',{hasText:'Amarillo'}).click()
    await card.locator('.quick-sizes:not(.quick-colors) button',{hasText:/^L$/}).click()
    await card.locator('.quick-confirm').click()
    await expect(page.locator('[data-testid=cart-color]')).toHaveText('COLOR / Amarillo')
    await expect(page.locator('[data-testid=cart-size]')).toHaveText('TALLA / L')
  })
})

test.describe('V4.4D admin variant color',()=>{
  test('color input is editable, saved with the variant and other fields survive',async({page})=>{
    const puts:any[]=[]
    await mockApi(page,catalog(),puts)
    await page.goto('/admin/products/qa-nike')
    const colors=page.locator('.variant-editor input[aria-label="Color"]')
    await expect(colors).toHaveCount(8)
    await expect(colors.first()).toHaveValue('Gris')
    await colors.first().fill('Gris claro')
    await page.locator('.variant-editor input[placeholder="Stock"]').nth(1).fill('7')
    await page.getByRole('button',{name:/GUARDAR CAMBIOS/}).click()
    await expect.poll(()=>puts.length).toBe(1)
    const saved:Variant[]=puts[0].product.variants
    expect(saved).toHaveLength(8)
    expect(saved[0].color).toBe('Gris claro')
    expect(saved[1].color).toBe('Gris')            // untouched color preserved while stock was edited
    expect(saved[1].stock).toBe(7)
    expect(saved.filter(v=>v.color==='Amarillo')).toHaveLength(4)
  })

  test('a new variant can be created with size and color',async({page})=>{
    const puts:any[]=[]
    await mockApi(page,catalog(),puts)
    await page.goto('/admin/products/qa-nike')
    await page.getByRole('button',{name:'+ VARIANTE'}).click()
    const row=page.locator('.variant-editor > div').last()
    await row.locator('input[aria-label="Talla"]').fill('XXL')
    await row.locator('input[aria-label="Color"]').fill('Rojo')
    await page.getByRole('button',{name:/GUARDAR CAMBIOS/}).click()
    await expect.poll(()=>puts.length).toBe(1)
    const created=puts[0].product.variants.at(-1)
    expect(created.size).toBe('XXL')
    expect(created.color).toBe('Rojo')
  })
})

test.describe('V4.4D branding',()=>{
  for(const [w,h] of [[1440,900],[1024,768],[768,1024],[430,932],[390,844]]){
    test(`logo in header and footer is undistorted and contained @${w}`,async({page})=>{
      await page.setViewportSize({width:w,height:h})
      await mockApi(page,catalog())
      await page.goto('/')
      const logo=page.locator('header.nav .brand-logo')
      await expect(logo).toBeVisible()
      await expect.poll(()=>logo.evaluate((i:HTMLImageElement)=>i.naturalWidth)).toBeGreaterThan(0)
      const m=await page.evaluate(()=>{const i=document.querySelector('header.nav .brand-logo') as HTMLImageElement;const r=i.getBoundingClientRect();return {w:r.width,h:r.height,nw:i.naturalWidth,nh:i.naturalHeight,header:(document.querySelector('[data-header]') as HTMLElement).offsetHeight,sw:document.documentElement.scrollWidth,vw:innerWidth}})
      expect(Math.abs(m.w/m.h-m.nw/m.nh)/(m.nw/m.nh)).toBeLessThan(0.01)
      expect(m.h).toBeLessThanOrEqual(m.header-12)
      expect(m.sw).toBeLessThanOrEqual(m.vw+1)
      await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight))
      const footer=page.locator('.footer-brand .brand-logo')
      await expect(footer).toBeVisible()
      const box=await footer.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x+box!.width).toBeLessThanOrEqual(w)
    })
  }

  test('falls back to the EL PUNTO text when the logo fails or is not configured',async({page})=>{
    await mockApi(page,catalog('/api/site-media/missing.png'))
    await page.goto('/')
    await expect(page.locator('header.nav .brand-text')).toHaveText('EL PUNTO')
    await expect(page.locator('.footer-brand .brand-text')).toHaveText('EL PUNTO')
    const none=await page.context().newPage()
    await mockApi(none,catalog(null))
    await none.goto('/')
    await expect(none.locator('header.nav .brand-text')).toHaveText('EL PUNTO')
  })

  test('no leftover provisional STORE / 001 brand in header or footer',async({page})=>{
    const c=catalog(null);c.site.brandName=null
    await mockApi(page,c)
    await page.goto('/')
    await expect(page.locator('header.nav .brand-text')).toHaveText('EL PUNTO')
    await expect(page.locator('.footer-brand .brand-text')).toHaveText('EL PUNTO')
    expect(await page.locator('header.nav, footer.footer').allInnerTexts()).not.toContain('STORE / 001')
  })
})

test.describe('V4.4D.1 productStyle does not confuse color with style/fit',()=>{
  const styleProduct=(over:Partial<Product>):Product=>({...product('qa-style','Producto QA',[variant('qa-style','S',null,1)]),fit:null,subtitle:null,description:null,...over})

  test('a "gris y amarillo" description without fit yields no style',()=>{
    const nike=styleProduct({name:'Sudadera Nike',description:'Sudadera Nike disponible en color gris y amarillo.',color:'Gris / Amarillo',fit:null,
      media:[{id:'m',productId:'qa-style',mediaType:'hero',storagePath:null,publicUrl:'/x.png',alt:'Sudadera Nike, color gris',sortOrder:1}]})
    expect(productStyle(nike)).toBeNull()
    expect(productStyle(nike)).not.toBe('Gris')
  })

  test('color words never override a real fit',()=>{
    expect(productStyle(styleProduct({description:'Sudadera gris y amarilla.',fit:'Oversized'}))).toBe('Oversized')
    expect(productStyle(styleProduct({name:'Pantalón Negro Desgastado',description:'Pantalón denim negro con acabado desgastado.',fit:'Flared Fit'}))).toBe('Flared Fit')
  })

  test('semantic rules are preserved: Lavado gris, Rotos, Brillos, fit',()=>{
    expect(productStyle(styleProduct({name:'Pantalón Lavado Gris',description:'Denim gris con silueta amplia y acabado lavado.'}))).toBe('Lavado gris')
    expect(productStyle(styleProduct({name:'Pantalón Rotos'}))).toBe('Rotos')
    expect(productStyle(styleProduct({description:'Denim distressed con costuras vistas.'}))).toBe('Rotos')
    expect(productStyle(styleProduct({name:'Pantalón Diamantado con brillos'}))).toBe('Brillos')
    expect(productStyle(styleProduct({fit:'Regular'}))).toBe('Regular')
    expect(productStyle(styleProduct({}))).toBeNull()
  })

  test('the legacy seed products keep their styles',()=>{
    const byId=(id:string)=>seedCatalog.products.find(p=>p.id===id)!
    expect(productStyle(byId('denim-01'))).toBe('Rotos')
    expect(productStyle(byId('denim-02'))).toBe('Lavado gris')
  })

  test('PDP without a real style never shows "Por confirmar" (V4.4H): category label + PRODUCTO fact',async({page})=>{
    const cat=catalog()
    const nike=cat.products.find(p=>p.id==='qa-nike')!
    nike.name='Sudadera Nike';nike.description='Sudadera Nike disponible en color gris y amarillo.';nike.color='Gris / Amarillo';nike.fit=null
    await mockApi(page,cat)
    await page.goto('/product/qa-nike')
    const fact=page.locator('.product-facts > div').first()
    await expect(fact).toContainText('PRODUCTO')
    await expect(fact.locator('b')).toHaveText('Sudadera')
    await expect(page.locator('.pdp-info > span').first()).toHaveText('SUDADERAS')
    await expect(page.locator('.pdp-info')).not.toContainText('Por confirmar')
    await expect(page.locator('.pdp-info')).not.toContainText('ESTILO POR CONFIRMAR')
    await expect(page.locator('.pdp-info')).not.toContainText('Estilo: Gris')
  })
})
