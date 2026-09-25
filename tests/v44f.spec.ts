import { test, expect, type Page, type Route } from '@playwright/test'
import { seedCatalog } from '../src/data/seed'
import type { CatalogSnapshot, Product } from '../src/types'

// Five active categories (Pantalones, Camisetas, Sudaderas, Perfumes, Shorts) built from the seed, so the Home category section renders like production.
function fiveCategoryCatalog():CatalogSnapshot{
  const c=structuredClone(seedCatalog)
  const tee=c.products.find(p=>p.id==='tee-01')!
  const extra=(id:string,category:string,categoryId:string,sortOrder:number):Product=>({...structuredClone(tee),id,slug:id,name:category+' QA',nameStatus:'confirmed',category,categoryId,status:'active',sortOrder,variants:tee.variants.map((v,i)=>({...v,id:id+'-'+i,productId:id})),media:tee.media.map((m,i)=>({...m,id:id+'-m'+i,productId:id}))})
  const hoodies=c.categories.find(x=>x.name==='Sudaderas')!
  c.products=[...c.products.filter(p=>p.category!=='Conjuntos'),extra('qa-sudadera','Sudaderas',hoodies.id,90),extra('qa-short','Shorts','cat-shorts',91)]
  c.categories=[...c.categories.filter(x=>x.name!=='Conjuntos'),{id:'cat-shorts',slug:'shorts',name:'Shorts',enabled:true,sortOrder:99}]
  return c
}
async function mockApi(page:Page,catalog:CatalogSnapshot){
  await page.route('**/api/**',async(route:Route)=>{
    const path=new URL(route.request().url()).pathname
    if(path==='/api/catalog')return route.fulfill({json:catalog})
    return route.continue()
  })
}

const WIDTHS:[number,number][]=[[1440,900],[1024,768],[768,1024],[430,932],[390,844]]
for(const [w,h] of WIDTHS){
  test(`V4.4F categories headline never enters the image stage @${w} (5 categories)`,async({page})=>{
    await page.setViewportSize({width:w,height:h})
    await mockApi(page,fiveCategoryCatalog())
    await page.goto('/')
    await expect(page.locator('.collection-links a')).toHaveCount(5)
    await page.locator('.collections').scrollIntoViewIfNeeded()
    await page.evaluate(()=>document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el=>el.classList.add('visible')))
    await page.waitForTimeout(500)
    const g=await page.evaluate(()=>{
      const h2=document.querySelector('.collections-heading h2') as HTMLElement
      const range=document.createRange();range.selectNodeContents(h2)
      const rects=[...range.getClientRects()]
      const textRight=Math.max(...rects.map(r=>r.right)),textBottom=Math.max(...rects.map(r=>r.bottom))
      const stage=document.querySelector('.category-stage') as HTMLElement;const s=stage.getBoundingClientRect()
      const sideBySide=s.left>h2.getBoundingClientRect().left+20&&s.top<textBottom-2
      return {textRight,textBottom,stageLeft:s.left,stageTop:s.top,sideBySide,sw:document.documentElement.scrollWidth,vw:innerWidth,font:parseFloat(getComputedStyle(h2).fontSize)}
    })
    if(g.sideBySide){
      // right edge of the headline text <= left edge of the category stage (1px tolerance)
      expect(g.textRight,`headline right ${g.textRight} must be <= stage left ${g.stageLeft}`).toBeLessThanOrEqual(g.stageLeft+1)
    }else{
      // stacked (<=768): the headline sits above the stage and stays inside the viewport
      expect(g.textBottom,'stacked headline must end above the stage').toBeLessThanOrEqual(g.stageTop+1)
      expect(g.textRight).toBeLessThanOrEqual(g.vw)
    }
    expect(g.sw,'no horizontal overflow').toBeLessThanOrEqual(g.vw+1)
    // the headline must stay a real display title (not shrunk to body size)
    expect(g.font).toBeGreaterThanOrEqual(w>=1025?60:w>=769?44:30)
  })
}

test('V4.4F categories headline stays clear of the stage across intermediate desktop widths',async({page})=>{
  await mockApi(page,fiveCategoryCatalog())
  await page.goto('/')
  await expect(page.locator('.collection-links a')).toHaveCount(5)
  for(const w of [1600,1366,1280,1180,1100,1025,1000,900,820,769]){
    await page.setViewportSize({width:w,height:900});await page.waitForTimeout(200)
    const gap=await page.evaluate(()=>{const h2=document.querySelector('.collections-heading h2') as HTMLElement;const r=document.createRange();r.selectNodeContents(h2);const tr=Math.max(...[...r.getClientRects()].map(x=>x.right));return (document.querySelector('.category-stage') as HTMLElement).getBoundingClientRect().left-tr})
    expect(gap,`clearance at ${w}px`).toBeGreaterThanOrEqual(-1)
  }
})

// -------- media: heroes must be served as optimized WebP (skipped unless PROD_MEDIA=1: needs network to production) --------
test('V4.4F hero media are optimized WebP files (production)',async({request})=>{
  test.skip(process.env.PROD_MEDIA!=='1','production check, run with PROD_MEDIA=1')
  const base='https://streetwear-perfume-commerce.nexocolmj.workers.dev'
  const cat=await (await request.get(base+'/api/catalog')).json()
  const r2=cat.products.flatMap((p:any)=>p.media).filter((m:any)=>m.storagePath)
  expect(r2.length).toBe(26)
  for(const m of r2){
    const res=await request.get(base+m.publicUrl)
    expect(res.status(),m.id).toBe(200)
    expect(res.headers()['content-type'],m.id).toContain('image/webp')
    expect((await res.body()).length,m.id).toBeLessThan(400*1024)
    expect(m.storagePath,m.id).toMatch(/^products\/[^/]+\/web\/(hero|front)-v1\.webp$/)
  }
})
