import { test, expect, type Page, type Route } from '@playwright/test'
import { seedCatalog } from '../src/data/seed'
import type { CatalogSnapshot, Product } from '../src/types'

// Five active categories (Pantalones, Camisetas, Sudaderas, Perfumes, Shorts) built from the seed, so Home renders like production.
function fiveCategoryCatalog():CatalogSnapshot{
  const c=structuredClone(seedCatalog)
  const tee=c.products.find(p=>p.id==='tee-01')!
  const extra=(id:string,category:string,categoryId:string,sortOrder:number):Product=>({...structuredClone(tee),id,slug:id,name:category+' QA',nameStatus:'confirmed',category,categoryId,status:'active',sortOrder,variants:tee.variants.map((v,i)=>({...v,id:id+'-'+i,productId:id})),media:tee.media.map((m,i)=>({...m,id:id+'-m'+i,productId:id}))})
  const hoodies=c.categories.find(x=>x.name==='Sudaderas')!
  c.products=[...c.products.filter(p=>p.category!=='Conjuntos'),extra('qa-sudadera','Sudaderas',hoodies.id,90),extra('qa-short','Shorts','cat-shorts',91)]
  c.categories=[...c.categories.filter(x=>x.name!=='Conjuntos'),{id:'cat-shorts',slug:'shorts',name:'Shorts',enabled:true,sortOrder:99}]
  c.homepage={...c.homepage,featuredProductIds:['denim-01','tee-01','denim-02','qa-sudadera']} // 4 featured cards, as in production
  return c
}
async function mockApi(page:Page,catalog:CatalogSnapshot){
  await page.route('**/api/**',async(route:Route)=>{
    const path=new URL(route.request().url()).pathname
    if(path==='/api/catalog')return route.fulfill({json:catalog})
    return route.continue()
  })
}
const WIDTHS=[1440,1320,1280,1200,1100,1025,1024,900,820,769,768,430,390]
const scrollWidth=(page:Page)=>page.evaluate(()=>({sw:document.documentElement.scrollWidth,vw:innerWidth}))

async function categoryGeometry(page:Page){
  return page.evaluate(()=>{
    const h2=document.querySelector('.collections-heading h2') as HTMLElement
    const range=document.createRange();range.selectNodeContents(h2)
    const rects=[...range.getClientRects()]
    const textRight=Math.max(...rects.map(r=>r.right)),textBottom=Math.max(...rects.map(r=>r.bottom))
    const stage=(document.querySelector('.category-stage') as HTMLElement).getBoundingClientRect()
    const sideBySide=stage.left>h2.getBoundingClientRect().left+20&&stage.top<textBottom-2
    const links=[...document.querySelectorAll('.collection-links a')].map(a=>{
      const b=a.querySelector('b') as HTMLElement,em=a.querySelector('em') as HTMLElement,cta=em.querySelector('.cta-text') as HTMLElement|null
      const lr=document.createRange();lr.selectNodeContents(b)
      const label=lr.getBoundingClientRect(),row=a.getBoundingClientRect()
      const ctaTextVisible=!!cta&&getComputedStyle(cta).display!=='none'&&getComputedStyle(em).display!=='none'
      const emVisible=getComputedStyle(em).display!=='none'
      const ctaLeft=ctaTextVisible?(cta as HTMLElement).getBoundingClientRect().left:(emVisible?em.getBoundingClientRect().left:Infinity)
      return {name:b.innerText,labelRight:label.right,rowRight:row.right,ctaLeft,ctaTextVisible,emVisible}
    })
    return {textRight,textBottom,stageLeft:stage.left,stageTop:stage.top,sideBySide,links,font:parseFloat(getComputedStyle(h2).fontSize),vw:innerWidth}
  })
}

for(const w of WIDTHS){
  test(`V4.4F.1 Home: no overflow, headline clear of the stage, no CTA collisions @${w}`,async({page})=>{
    await page.setViewportSize({width:w,height:900})
    await mockApi(page,fiveCategoryCatalog())
    await page.goto('/')
    await expect(page.locator('.collection-links a')).toHaveCount(5)
    await expect(page.locator('.featured-rail .card')).toHaveCount(4)
    await page.evaluate(()=>document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el=>el.classList.add('visible')))
    await page.locator('.collections').scrollIntoViewIfNeeded();await page.waitForTimeout(400)

    // C. no horizontal overflow (real cause fixed; no overflow-x:hidden patch)
    const {sw,vw}=await scrollWidth(page)
    expect(sw,`scrollWidth ${sw} vs viewport ${vw}`).toBeLessThanOrEqual(vw+1)

    const g=await categoryGeometry(page)
    // A. headline right edge <= stage left edge minus a reasonable minimum (side by side); otherwise it sits above the stage inside the viewport
    if(g.sideBySide){
      expect(g.textRight,`headline right ${g.textRight} vs stage left ${g.stageLeft}`).toBeLessThanOrEqual(g.stageLeft-12)
    }else{
      expect(g.textBottom,'headline must end above the stage when stacked').toBeLessThanOrEqual(g.stageTop+1)
      expect(g.textRight).toBeLessThanOrEqual(g.vw)
    }
    // "do not shrink the headline excessively": at least 85% of the size the section had before (its own clamp for that range)
    const designed=w>=1101?Math.min(78,Math.max(48,.051*w)):w>=769?Math.min(56,Math.max(42,.055*w)):30
    expect(g.font,`headline ${g.font}px vs designed ${designed.toFixed(1)}px`).toBeGreaterThanOrEqual(designed*.85)

    // B. every link: label inside its row, and label right < CTA left (text CTA when shown, arrow otherwise) with a real gap
    expect(g.links.map(l=>l.name)).toEqual(['PANTALONES','CAMISETAS','PERFUMES','SUDADERAS','SHORTS'])
    for(const l of g.links){
      expect(l.labelRight,`${l.name} label must stay inside its row`).toBeLessThanOrEqual(l.rowRight+0.5)
      if(l.emVisible)expect(l.labelRight,`${l.name} label right ${l.labelRight} vs CTA left ${l.ctaLeft}`).toBeLessThanOrEqual(l.ctaLeft-8)
    }
    // the textual CTA only exists where it has room
    expect(g.links.every(l=>l.ctaTextVisible)||g.links.every(l=>!l.ctaTextVisible)).toBeTruthy()
    if(w>=1320)expect(g.links.every(l=>l.ctaTextVisible),'text CTA expected on wide desktop').toBeTruthy()
    if(w<1320&&w>=769)expect(g.links.every(l=>!l.ctaTextVisible),'arrow-only CTA below 1320').toBeTruthy()
    if(g.links.every(l=>l.ctaTextVisible))for(const l of g.links)expect(l.ctaLeft-l.labelRight,`${l.name} text-CTA clearance`).toBeGreaterThanOrEqual(12)
  })
}

const HEADING_WIDTHS=[1440,1280,1200,1150,1149,1100,1025,1024,900,430]
for(const w of HEADING_WIDTHS){
  test(`V4.4F.2 featured heading: title never touches "VER TODO", no overflow @${w}`,async({page})=>{
    await page.setViewportSize({width:w,height:900})
    await mockApi(page,fiveCategoryCatalog())
    await page.goto('/')
    await expect(page.locator('.featured-rail .card')).toHaveCount(4)
    await page.evaluate(()=>document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el=>el.classList.add('visible')))
    await page.locator('.featured-section').scrollIntoViewIfNeeded();await page.waitForTimeout(400)
    const g=await page.evaluate(()=>{
      const sh=document.querySelector('.section-heading') as HTMLElement
      const h2=sh.querySelector('h2') as HTMLElement,link=sh.querySelector(':scope > a') as HTMLElement,eyebrow=sh.children[0] as HTMLElement
      const tr=document.createRange();tr.selectNodeContents(h2)
      const headingRight=Math.max(...[...tr.getClientRects()].map(r=>r.right)),headingLeft=Math.min(...[...tr.getClientRects()].map(r=>r.left))
      const er=document.createRange();er.selectNodeContents(eyebrow)
      const eyebrowRight=Math.max(...[...er.getClientRects()].map(r=>r.right))
      const linkVisible=getComputedStyle(link).display!=='none'
      const cards=[...document.querySelectorAll('.featured-rail .card')].map(c=>{const b=c.getBoundingClientRect();return {l:b.left,r:b.right}})
      const rail=document.querySelector('.featured-rail') as HTMLElement
      const sideBySide=eyebrow.getBoundingClientRect().bottom>h2.getBoundingClientRect().top+2 // stacked (<=768): eyebrow sits above the title
      return {headingRight,headingLeft,eyebrowRight,sideBySide,linkVisible,ctaLeft:linkVisible?link.getBoundingClientRect().left:Infinity,sectionRight:sh.getBoundingClientRect().right,cards,ownScroll:getComputedStyle(rail).overflowX!=='visible',sw:document.documentElement.scrollWidth,vw:innerWidth}
    })
    expect(g.sw,`scrollWidth ${g.sw} vs ${g.vw}`).toBeLessThanOrEqual(g.vw+1)
    // the title glyphs stay inside the section box (the old layout overflowed it on the right)
    expect(g.headingRight,'title must stay inside its section').toBeLessThanOrEqual(g.sectionRight+1)
    // headingRight < ctaLeft - 16 whenever the CTA is visible
    if(g.linkVisible)expect(g.headingRight,`title right ${g.headingRight} vs CTA left ${g.ctaLeft}`).toBeLessThan(g.ctaLeft-16)
    // eyebrow column never runs into the title
    if(g.sideBySide)expect(g.eyebrowRight,'eyebrow vs title').toBeLessThan(g.headingLeft-8)
    // Featured cards keep fitting: grid mode -> every card inside the viewport; own-scroll mode (<=1024) -> first card inside, page not widened
    if(g.ownScroll)expect(g.cards[0].r).toBeLessThanOrEqual(g.vw+1)
    else for(const c of g.cards){expect(c.l).toBeGreaterThanOrEqual(-1);expect(c.r).toBeLessThanOrEqual(g.vw+1)}
    // CTA availability: unchanged at <=1024 (hidden), visible above
    expect(g.linkVisible).toBe(w>=1025)
  })
}

test('V4.4F.1 Shop and PDP have no horizontal overflow at every intermediate width',async({page})=>{
  await mockApi(page,fiveCategoryCatalog())
  for(const path of ['/shop','/product/'+seedCatalog.products[0].slug]){
    await page.goto(path)
    for(const w of WIDTHS){
      await page.setViewportSize({width:w,height:900});await page.waitForTimeout(150)
      const {sw,vw}=await scrollWidth(page)
      expect(sw,`${path} @${w}`).toBeLessThanOrEqual(vw+1)
    }
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
