import { test, expect, type Page } from '@playwright/test'
import { seedCatalog } from '../src/data/seed'
import type { CatalogSnapshot, Product, Variant } from '../src/types'
import { expandWatchProducts, mediaForVariant, productLink } from '../src/lib/watchCatalog'

const familyId='qa-watch-family'
const colors=['Azul','Azul claro','Negro']
const variants:Variant[]=colors.map((color,i)=>({
  id:`qa-watch-${i}`,productId:familyId,size:'Única',color,sku:null,
  price:70000,stock:i===2?0:null,available:i!==2,
  shopifyVariantId:`gid://shopify/ProductVariant/${100+i}`,sortOrder:i+1,
}))
const watch:Product={...structuredClone(seedCatalog.products[0]),
  id:familyId,slug:'qa-watch',name:'Reloj deportivo octagonal',category:'Relojería',categoryId:'cat-watches',
  price:70000,featured:false,bestSeller:false,newArrival:false,status:'active',sortOrder:900,
  variants,media:colors.map((color,i)=>({id:`qa-watch-media-${i}`,productId:familyId,mediaType:'front',storagePath:null,
    publicUrl:`/watch-${i}.png`,alt:`Reloj deportivo octagonal · ${color}`,sortOrder:i+1})),
}
const catalog:CatalogSnapshot={...structuredClone(seedCatalog),
  site:{...seedCatalog.site,shopifyEnabled:true},
  categories:[...seedCatalog.categories,{id:'cat-watches',slug:'relojeria',name:'Relojería',enabled:true,sortOrder:99}],
  products:[...seedCatalog.products,watch],
}

async function mockCatalog(page:Page,data:CatalogSnapshot=catalog){
  await page.route('**/api/catalog',route=>route.fulfill({json:data}))
  await page.route('**/watch-*.png',route=>route.fulfill({body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nAAAAABJRU5ErkJggg==','base64'),contentType:'image/png'}))
}

test('each watch variant maps to one exact photo, ID and link',()=>{
  const entries=expandWatchProducts([watch])
  expect(entries).toHaveLength(3)
  expect(entries.map(p=>p.media[0]?.id)).toEqual(['qa-watch-media-0','qa-watch-media-1','qa-watch-media-2'])
  expect(entries.map(p=>p.variants[0].id)).toEqual(variants.map(v=>v.id))
  expect(entries.map(productLink)).toEqual(variants.map(v=>`/product/qa-watch?variant=${encodeURIComponent(v.shopifyVariantId!)}`))
  expect(mediaForVariant(watch,variants[0])).toHaveLength(1)
})

test('Supreme opens with the three-color cover and selects each color photo',async({page})=>{
  const supremeId='qa-supreme'
  const supreme:Product={...structuredClone(watch),id:supremeId,slug:'buzo-supreme',name:'Buzo Supreme',category:'Buzos',categoryId:'cat-hoodies',
    price:140000,variants:['Gris','Negro','Rojo'].flatMap((color,i)=>['S','M'].map((size,j)=>({
      ...variants[0],id:`supreme-${i}-${j}`,productId:supremeId,color,size,price:140000,sortOrder:i*2+j,
    }))),
    media:[{id:'supreme-hero',productId:supremeId,mediaType:'hero',storagePath:null,publicUrl:'/watch-0.png',alt:'Buzo Supreme · negro, rojo y gris juntos',sortOrder:1},
      ...['Gris','Negro','Rojo'].map((color,i)=>({id:`supreme-${color}`,productId:supremeId,mediaType:'front' as const,storagePath:null,publicUrl:`/watch-${i}.png`,alt:`Buzo Supreme ${color.toLowerCase()} frente y espalda`,sortOrder:i+2}))],
  }
  await mockCatalog(page,{...catalog,products:[...catalog.products,supreme]})
  await page.goto('/product/buzo-supreme')
  await expect(page.locator('.gallery img').first()).toHaveAttribute('src','/watch-0.png')
  await page.locator('.color-options button',{hasText:'Rojo'}).click()
  await expect(page.locator('.gallery img').first()).toHaveAttribute('src','/watch-2.png')
  await page.locator('.color-options button',{hasText:'Negro'}).click()
  await expect(page.locator('.gallery img').first()).toHaveAttribute('src','/watch-1.png')
  await expect(page.locator('.gallery img')).toHaveCount(4)
})

test('watch listing, search, deep link and cart keep the exact variant',async({page})=>{
  await mockCatalog(page)
  await page.goto('/shop?cat=Relojer%C3%ADa')
  await expect(page.locator('.catalog-grid article.card')).toHaveCount(3)
  await expect(page.locator('.shop-hero')).toContainText('3 PRODUCTOS')
  await expect(page.locator('.catalog-grid article.card').last()).toContainText('NO DISPONIBLE')
  await expect(page.locator('.catalog-grid article.card').first()).toContainText('Azul')
  await page.locator('.catalog-grid article.card').first().locator('.card-actions button').click()
  await expect(page.locator('[data-testid=cart-color]')).toHaveText('COLOR / Azul')
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('streetwear.cart.v3')||'[]'))
  expect(stored[0]).toMatchObject({productId:familyId,variantId:variants[0].id})
  await page.goto(productLink(expandWatchProducts([watch])[1]))
  await expect(page.locator('.pdp-info h1')).toContainText('Azul claro')
  await expect(page.locator('.gallery img').first()).toHaveAttribute('src','/watch-1.png')
  await page.reload()
  await expect(page.locator('[data-testid=selected-color]')).toHaveText('Azul claro')
  await page.goto(productLink(expandWatchProducts([watch])[2]))
  await expect(page.locator('.pdp-info h1')).toContainText('Negro')
  await expect(page.locator('.add-button')).toBeDisabled()
  await expect(page.locator('.gallery img').first()).toHaveAttribute('src','/watch-2.png')
  await page.getByRole('button',{name:'Buscar',exact:true}).click()
  await page.getByRole('textbox',{name:'Buscar productos'}).fill('Azul claro')
  await expect(page.locator('.search-results a')).toHaveCount(1)
  await expect(page.locator('.search-results a')).toHaveAttribute('href',productLink(expandWatchProducts([watch])[1]))
})
