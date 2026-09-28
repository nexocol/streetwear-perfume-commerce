import { test, expect, type Page, type Route } from '@playwright/test'
import { seedCatalog } from '../src/data/seed'
import { categoryShopLinks } from '../src/lib/clientContent'

async function mockApi(page:Page){
  await page.route('**/api/**',async(route:Route)=>{
    const path=new URL(route.request().url()).pathname
    if(path==='/api/catalog')return route.fulfill({json:seedCatalog})
    return route.continue()
  })
  await page.route(/googleusercontent\.com/,r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="24"/>'}))
}

test.describe('V4.7 premium UX + motion',()=>{
  test('desktop always exposes the hamburger and category-first menu',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/')
    await expect(page.locator('.premium-menu-trigger')).toBeVisible()
    await page.locator('.premium-menu-trigger').click()
    await expect(page.locator('.premium-menu.open')).toBeVisible()
    const expected=categoryShopLinks(seedCatalog)
    await expect(page.locator('.premium-menu-cats a')).toHaveCount(expected.length)
    await expect(page.locator('.premium-menu-cats a')).toHaveText(expected.map(x=>new RegExp(x.label,'i')))
    await expect(page.locator('.premium-menu-preview')).toBeVisible()
    await page.locator('.premium-menu-cats a').last().hover()
    await expect(page.locator('.premium-menu-preview img')).toBeVisible()
  })

  test('first viewport exposes direct shopping categories before scrolling',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/')
    const jump=page.locator('.hero-category-jump')
    await expect(jump).toBeVisible();await expect(jump).toBeInViewport()
    const expected=categoryShopLinks(seedCatalog)
    await expect(jump.locator('a')).toHaveCount(expected.length)
    await expect(jump.locator('a')).toHaveText(expected.map(x=>new RegExp(x.label,'i')))
    await jump.locator('a').first().click()
    await expect(page).toHaveURL(/\/shop\?cat=/)
  })

  test('route shell, scroll progress and GSAP orchestration initialize without changing storefront behavior',async({page})=>{
    await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/')
    await expect(page.locator('.route-stage')).toBeVisible()
    await expect(page.locator('.scroll-progress')).toHaveCount(1)
    await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.gsapMotion)).toBe('ready')
    const before=await page.locator('.scroll-progress').evaluate(el=>getComputedStyle(el).transform)
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight*.5));await page.waitForTimeout(160)
    const after=await page.locator('.scroll-progress').evaluate(el=>getComputedStyle(el).transform)
    expect(after).not.toBe(before)
  })

  for(const width of [1024,768,430,390])test(`premium menu @${width}: no clipping or root overflow`,async({page})=>{
    await page.setViewportSize({width,height:900});await mockApi(page);await page.goto('/')
    await page.locator('.premium-menu-trigger').click();await expect(page.locator('.premium-menu.open')).toBeVisible()
    const report=await page.evaluate(()=>{
      const vw=document.documentElement.clientWidth
      const nodes=[...document.querySelectorAll<HTMLElement>('.premium-menu-shop span,.premium-menu-cats b,.premium-menu-secondary a,.premium-menu-secondary button')]
      return {overflow:document.documentElement.scrollWidth-vw,boxes:nodes.map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent?.trim(),left:r.left,right:r.right}})}
    })
    expect(report.overflow).toBeLessThanOrEqual(0)
    for(const b of report.boxes){expect(b.left,b.text).toBeGreaterThanOrEqual(16);expect(b.right,b.text).toBeLessThanOrEqual(width-16)}
  })

  test('reduced motion removes decorative animation burden',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await mockApi(page);await page.goto('/')
    await expect(page.locator('.hero-ambient')).toHaveCSS('display','none')
    await expect(page.locator('.route-stage')).toHaveCSS('animation-name','none')
    await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.gsapMotion)).toBe('reduced')
  })
})
