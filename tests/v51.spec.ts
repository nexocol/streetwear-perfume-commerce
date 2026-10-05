import {expect,test,type Page} from '@playwright/test'
import {seedCatalog} from '../src/data/seed'

async function catalogFixture(page:Page){
  const catalog=structuredClone(seedCatalog)
  catalog.site.shopifyEnabled=true
  for(const product of catalog.products)for(const variant of product.variants){
    variant.shopifyVariantId='gid://shopify/ProductVariant/qa-'+variant.id
    variant.price=product.price
    variant.available=true
    variant.stock=10
  }
  const unavailable=catalog.products.find(product=>product.category==='Jeans')!
  unavailable.name='Pantalón sin inventario'
  for(const variant of unavailable.variants){variant.available=false;variant.stock=0}
  const available=catalog.products.find(product=>product.category==='Jeans'&&product.id!==unavailable.id)!
  available.name='Pantalón disponible'
  const shirt=catalog.products.find(p=>p.category==='Streetwear')!
  shirt.variants.push({...shirt.variants[0],id:'qa-retired',size:'XXXL',price:null,stock:0,available:false,shopifyVariantId:'gid://shopify/ProductVariant/qa-retired'})
  catalog.categories.push({id:'qa-buzos',slug:'buzos',name:'Buzos',enabled:true,sortOrder:6})
  catalog.categories.push({id:'qa-watches',slug:'relojeria',name:'Relojería',enabled:true,sortOrder:7})
  const watch=structuredClone(available)
  Object.assign(watch,{id:'qa-watch',slug:'qa-watch',name:'Reloj deportivo octagonal',categoryId:'qa-watches',category:'Relojería',fit:null})
  watch.variants=['Negro','Bicolor esfera blanca con marcadores'].map((color,i)=>({...watch.variants[0],id:'qa-watch-'+i,productId:'qa-watch',size:'Única',color,price:70000,stock:0,available:true}))
  catalog.products.push(watch)
  for(const [id,name,subtitle] of [['qa-buzo','Buzo Supreme','Buzo'],['qa-camibuzo','Camibuzo Godspeed Calavera','Camibuzo']]){
    const product=structuredClone(available)
    Object.assign(product,{id,slug:id,name,subtitle,categoryId:'qa-buzos',category:'Buzos'})
    product.variants=product.variants.map(v=>({...v,id:id+'-'+v.id,productId:id}))
    catalog.products.push(product)
  }
  await page.route('**/api/**',route=>{
    if(new URL(route.request().url()).pathname==='/api/catalog')return route.fulfill({json:catalog})
    return route.fulfill({status:404,json:{error:'Not found'}})
  })
  return {catalog,unavailable,available}
}

test('V5.1 lists available products first and keeps unavailable products visible',async({page})=>{
  const {unavailable,available}=await catalogFixture(page)
  await page.goto('/shop?cat=Jeans')
  const cards=page.locator('.catalog-grid .card')
  await expect(cards).toHaveCount(2)
  await expect(cards.first().getByRole('heading')).toHaveText(available.name)
  const unavailableCard=cards.filter({hasText:unavailable.name})
  await expect(unavailableCard).toContainText('NO DISPONIBLE')
  await expect(unavailableCard.locator('.card-actions button')).toBeDisabled()

  await page.goto('/product/'+unavailable.slug)
  await expect(page.locator('.product-facts')).toContainText('NO DISPONIBLE')
  await expect(page.locator('.add-button')).toBeDisabled()
})

test('V5.1 keeps buzos and camibuzos together with a subtype filter',async({page})=>{
  await catalogFixture(page)
  await page.goto('/shop?cat=Buzos')
  await expect(page.locator('.catalog-grid .card')).toHaveCount(2)
  await page.getByRole('button',{name:/FILTRAR \/ ORDENAR/}).click()
  await page.locator('.filter-panel').getByRole('button',{name:'Camibuzos',exact:true}).click()
  await expect(page).toHaveURL(/cat=Buzos&fit=Camibuzos/)
  await expect(page.locator('.catalog-grid .card')).toHaveCount(1)
  await expect(page.locator('.catalog-grid .card')).toContainText('Camibuzo Godspeed Calavera')
  await page.locator('.filter-panel section').filter({hasText:'ESTILO / SUBTIPO'}).getByRole('button',{name:'Buzos',exact:true}).click()
  await expect(page.locator('.catalog-grid .card')).toHaveCount(1)
  await expect(page.locator('.catalog-grid .card')).toContainText('Buzo Supreme')
})

test('V5.1 shows the client home copy and shirt size guide',async({page})=>{
  const {catalog}=await catalogFixture(page)
  await page.goto('/')
  await expect(page.locator('.hero-title')).toContainText('LA MEJOR CALIDAD EN CADA DROP')
  await expect(page.locator('.hero-bottom')).toContainText('Compra al detal directamente en la web')

  const shirt=catalog.products.find(product=>product.category==='Streetwear')!
  await page.goto('/product/'+shirt.slug)
  await expect(page.locator('.pdp-info .price')).not.toContainText('PRECIO POR CONFIRMAR')
  await page.getByRole('button',{name:/GUÍA DE TALLAS/}).click()
  const dialog=page.locator('#size-dialog')
  await expect(dialog).toContainText('Guía de tallas para camisetas')
  await expect(dialog).toContainText('1,62–1,70 m')
  await expect(dialog).toContainText('1,86 m en adelante')
})

test('V5.1 honors Shopify availability for a watch without tracked inventory',async({page})=>{
  await page.setViewportSize({width:390,height:844})
  await catalogFixture(page)
  await page.goto('/product/qa-watch')
  await expect(page.locator('.add-button')).toBeEnabled()
  await expect(page.locator('.product-facts')).not.toContainText('NO DISPONIBLE')
  await page.getByRole('button',{name:'Bicolor esfera blanca con marcadores',exact:true}).click()
  await expect(page.locator('.add-button')).toBeEnabled()
  await expect(page.getByTestId('selected-color')).toHaveText('Bicolor esfera blanca con marcadores')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
})
