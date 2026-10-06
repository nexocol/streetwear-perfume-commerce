import { expect, test, type Page } from '@playwright/test'
import { seedCatalog } from '../src/data/seed'

async function mockCatalog(page:Page){
  const catalog=structuredClone(seedCatalog)
  const source=catalog.products.find(product=>product.category==='Streetwear')!
  const buzo=structuredClone(source)
  Object.assign(buzo,{id:'qa-buzo',slug:'qa-buzo',name:'Buzo de prueba',category:'Buzos',categoryId:'qa-buzos'})
  buzo.variants=buzo.variants.map(variant=>({...variant,id:'qa-'+variant.id,productId:buzo.id}))
  catalog.products.push(buzo)
  catalog.categories.push({id:'qa-buzos',slug:'buzos',name:'Buzos',enabled:true,sortOrder:8})
  const shorts=structuredClone(source)
  Object.assign(shorts,{id:'qa-shorts',slug:'qa-shorts',name:'Pantaloneta de prueba',category:'Pantalonetas',categoryId:'qa-shorts'})
  shorts.variants=shorts.variants.map(variant=>({...variant,id:'shorts-'+variant.id,productId:shorts.id}))
  catalog.products.push(shorts)
  catalog.categories.push({id:'qa-shorts',slug:'pantalonetas',name:'Pantalonetas',enabled:true,sortOrder:9})
  await page.route('**/api/catalog',route=>route.fulfill({json:catalog}))
  return catalog
}

for(const [device,width,height] of [['escritorio',1280,900],['móvil',390,844]] as const){
  test(`guías contextuales en ${device}: catálogo, ficha y pie`,async({page})=>{
    await page.setViewportSize({width,height})
    const catalog=await mockCatalog(page)
    const dialog=page.locator('#size-dialog')
    const rail=page.locator('.trust-rail').getByRole('button',{name:/GUÍA DE TALLAS/})

    await page.goto('/shop?cat=Streetwear')
    await rail.click()
    await expect(dialog).toContainText('Guía de tallas para camisetas')
    await expect(dialog).toContainText('Estatura recomendada')
    await expect(dialog).not.toContainText('Cintura')
    const shirtColumns=await dialog.locator('.size-row.head').evaluate(row=>getComputedStyle(row).gridTemplateColumns.split(' ').length)
    expect(shirtColumns).toBe(2)
    await page.keyboard.press('Escape')
    await page.locator('.footer').getByRole('button',{name:'Guía de tallas'}).click()
    await expect(dialog).toContainText('Guía de tallas para camisetas')
    await page.keyboard.press('Escape')

    await page.goto('/shop?cat=Jeans')
    await rail.click()
    await expect(dialog).toContainText('Cintura')
    await expect(dialog).toContainText('Cadera')
    await expect(dialog).not.toContainText('Estatura recomendada')
    await page.keyboard.press('Escape')

    await page.goto('/shop?cat=Buzos')
    await rail.click()
    await expect(dialog).toContainText('Guía de tallas para buzos y sudaderas')
    await expect(dialog).toContainText('Referencia general por estatura')
    await expect(dialog.locator('.size-row.head > b')).toHaveCount(2)
    const columns=await dialog.locator('.size-row.head').evaluate(row=>getComputedStyle(row).gridTemplateColumns.split(' ').length)
    expect(columns).toBe(2)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    await page.keyboard.press('Escape')

    await page.goto('/shop?cat=Pantalonetas')
    await rail.click()
    await expect(dialog).toContainText('Tallas de pantalonetas')
    await expect(dialog).toContainText('No hay medidas de cintura, cadera o largo confirmadas')
    await expect(dialog).not.toContainText('80 cm')
    await page.keyboard.press('Escape')

    await page.goto('/product/qa-buzo')
    await page.locator('.pdp-info').getByRole('button',{name:'GUÍA DE TALLAS'}).click()
    await expect(dialog).toContainText('Guía de tallas para buzos y sudaderas')
    await page.keyboard.press('Escape')

    const shirt=catalog.products.find(product=>product.category==='Streetwear')!
    await page.goto('/product/'+shirt.slug)
    await page.locator('.pdp-info').getByRole('button',{name:'GUÍA DE TALLAS'}).click()
    await expect(dialog).toContainText('Guía de tallas para camisetas')
    await page.keyboard.press('Escape')

    await page.goto('/shop?cat=Perfumes')
    await expect(rail).toHaveCount(0)
    await page.locator('.footer').getByRole('button',{name:'Guía de tallas'}).click()
    await expect(dialog).toContainText('Cintura')
    await page.keyboard.press('Escape')
    await page.goto('/shop?cat=Relojería')
    await expect(rail).toHaveCount(0)
  })
}
