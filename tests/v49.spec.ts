import { test, expect, request as pwRequest, type APIRequestContext, type Page } from '@playwright/test'

// Runs against the REAL Worker + local D1 (playwright.v49.config.ts). Client and demo accounts come from scripts/admin-bootstrap.mjs.
// Test-only values: the real client temporary password is never written into the repository.
const TEMP='qa-temp-Clave-0001'
const NEW_PASSWORD='Nuev4-Clave-2026'
const DEMO_USER='nexo-demo'
const DEMO_PASS='demo-test-pass-9x'
const DEMO_MESSAGE='MODO DEMO — Los cambios no se guardan.'
const FORGED_ACCESS={'cf-access-jwt-assertion':'x.'+Buffer.from(JSON.stringify({email:'attacker@example.com'})).toString('base64url')+'.y'}

test.describe.configure({mode:'serial'})

let ipCounter=20
const nextIp=()=>`203.0.113.${++ipCounter}`
const post=(request:APIRequestContext,scope:'panel'|'demo',action:string,data:unknown,ip=nextIp())=>request.post(`/api/${scope}/${action}`,{data,headers:{'cf-connecting-ip':ip}})
const apiLogin=(request:APIRequestContext,scope:'panel'|'demo',username:string,password:string,ip?:string)=>post(request,scope,'login',{username,password},ip)
const sessionCookie=async(page:Page,name:string)=>(await page.context().cookies()).find(c=>c.name===name)

async function uiLogin(page:Page,base:string,username:string,password:string){
  await page.goto(base)
  await page.getByLabel('Usuario',{exact:true}).fill(username)
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'INGRESAR'}).click()
}
const publicHome=async(request:APIRequestContext)=>{const j=await (await request.get('/api/catalog')).json();return JSON.stringify({home:j.homepage,site:j.site})}

test.describe('client panel',()=>{
  test.use({extraHTTPHeaders:{'cf-connecting-ip':'198.51.100.10'}})

  test('/panel shows only the branded EL PUNTO login, and is not indexable',async({page,request})=>{
    await page.goto('/panel')
    await expect(page.getByRole('heading',{name:'Panel administrativo'})).toBeVisible()
    await expect(page).toHaveTitle('Panel administrativo · EL PUNTO')
    for(const text of ['EL PUNTO','Usuario','Contraseña','INGRESAR','Administración de tienda'])await expect(page.getByText(text,{exact:true}).first()).toBeVisible()
    const visible=await page.locator('body').innerText()
    expect(visible).not.toMatch(/cloudflare|google|oauth|zero trust|access\b|token|api\b/i)
    for(const path of ['/panel','/panel/products','/panel/cambiar-clave']){
      const res=await request.get(path)
      expect(res.headers()['x-robots-tag'],path).toContain('noindex')
      expect(await res.text(),path).toMatch(/<meta name="robots" content="noindex,nofollow,noarchive"/)
    }
  })

  test('invalid credentials fail with one generic answer and never set a session',async({page,request})=>{
    await uiLogin(page,'/panel','administrador','contraseña-incorrecta')
    await expect(page.getByRole('alert')).toHaveText('Usuario o contraseña incorrectos.')
    await expect(page.getByRole('heading',{name:'Panel administrativo'})).toBeVisible()
    expect(await sessionCookie(page,'ep_panel')).toBeUndefined()
    const wrongUser=await apiLogin(request,'panel','nadie-existe','qa-otra-clave-1')
    const wrongPass=await apiLogin(request,'panel','administrador','otra-clave-mala')
    expect([wrongUser.status(),wrongPass.status()]).toEqual([401,401])
    expect(await wrongUser.json()).toEqual(await wrongPass.json())
    expect(wrongUser.headers()['set-cookie']).toBeUndefined()
  })

  test('repeated failures lock the attempt briefly without saying which part was wrong',async({request})=>{
    const ip='198.51.100.77'
    for(let i=0;i<5;i++)expect((await apiLogin(request,'panel','probe-user','x'+i,ip)).status()).toBe(401)
    const byIp=await apiLogin(request,'panel','administrador',TEMP,ip)
    expect(byIp.status()).toBe(429)
    expect(byIp.headers()['retry-after']).toBeTruthy()
    const byUser=await apiLogin(request,'panel','probe-user','otra',nextIp())
    expect(byUser.status()).toBe(429)
    expect(JSON.stringify(await byUser.json())).not.toMatch(/usuario no|contraseña incorrecta|no existe/i)
  })

  test('temporary credentials force a password change before anything else, then the change works once',async({page})=>{
    await uiLogin(page,'/panel','administrador',TEMP)
    await expect(page).toHaveURL(/\/panel\/cambiar-clave$/)
    await expect(page.getByRole('heading',{name:'Crea tu nueva contraseña'})).toBeVisible()
    // Server-side gate: the CMS API refuses this session until the password is replaced.
    const gated=await page.request.get('/api/panel/catalog')
    expect(gated.status()).toBe(403)
    expect((await gated.json()).code).toBe('PASSWORD_CHANGE_REQUIRED')
    expect((await page.request.put('/api/panel/home',{data:{}})).status()).toBe(403)
    await page.goto('/panel/products')
    await expect(page).toHaveURL(/\/panel\/cambiar-clave$/)

    const staleToken=(await sessionCookie(page,'ep_panel'))!.value
    const newPass=page.getByLabel('Nueva contraseña',{exact:true}),confirm=page.getByLabel('Confirmar contraseña',{exact:true})
    const submit=page.getByRole('button',{name:'GUARDAR CONTRASEÑA'})
    await newPass.fill('corta');await confirm.fill('corta');await submit.click()
    await expect(page.getByRole('alert')).toContainText('al menos 8 caracteres')
    await newPass.fill(NEW_PASSWORD);await confirm.fill(NEW_PASSWORD+'x');await submit.click()
    await expect(page.getByRole('alert')).toContainText('no coinciden')
    await newPass.fill(TEMP);await confirm.fill(TEMP);await submit.click()
    await expect(page.getByRole('alert')).toContainText('distinta de la temporal')
    await newPass.fill(NEW_PASSWORD);await confirm.fill(NEW_PASSWORD);await submit.click()

    await expect(page).toHaveURL(/\/panel\/products$/)
    await expect(page.getByRole('heading',{name:'CATÁLOGO.'})).toBeVisible()
    expect((await page.request.get('/api/panel/catalog')).status()).toBe(200)
    const freshToken=(await sessionCookie(page,'ep_panel'))!.value
    expect(freshToken).not.toBe(staleToken)
    // The pre-change session was destroyed, not just replaced in the browser.
    const stale=await pwRequest.newContext({baseURL:'http://127.0.0.1:8799',extraHTTPHeaders:{cookie:'ep_panel='+staleToken}})
    expect((await stale.get('/api/panel/session')).status()).toBe(401)
    await stale.dispose()
    const cookie=await sessionCookie(page,'ep_panel')
    expect(cookie).toMatchObject({httpOnly:true,sameSite:'Lax',path:'/api/panel'})
    expect(cookie!.expires).toBeGreaterThan(Date.now()/1000+6*24*3600)
  })

  test('the temporary password stops working; the new one works and opens the admin',async({page,request})=>{
    expect((await apiLogin(request,'panel','administrador',TEMP)).status()).toBe(401)
    await uiLogin(page,'/panel','administrador',NEW_PASSWORD)
    await expect(page).toHaveURL(/\/panel\/products$/)
    await expect(page.getByRole('heading',{name:'CATÁLOGO.'})).toBeVisible()
    await expect(page.locator('.admin-product-list article').first()).toBeVisible()
    expect(await page.locator('.admin-nav a').evaluateAll(a=>a.map(x=>x.getAttribute('href')))).toEqual(['/panel/products','/panel/home','/panel/settings'])
    await expect(page.getByText('MODO DEMO')).toHaveCount(0)
  })

  test('logout (button and /panel/logout) invalidates the session server-side',async({page})=>{
    await uiLogin(page,'/panel','administrador',NEW_PASSWORD)
    await expect(page.getByRole('heading',{name:'CATÁLOGO.'})).toBeVisible()
    const token=(await sessionCookie(page,'ep_panel'))!.value
    await page.getByRole('button',{name:'SALIR'}).click()
    await expect(page.getByRole('heading',{name:'Panel administrativo'})).toBeVisible()
    const replay=await pwRequest.newContext({baseURL:'http://127.0.0.1:8799',extraHTTPHeaders:{cookie:'ep_panel='+token}})
    expect((await replay.get('/api/panel/catalog')).status()).toBe(401)
    await replay.dispose()

    await uiLogin(page,'/panel','administrador',NEW_PASSWORD)
    await expect(page.getByRole('heading',{name:'CATÁLOGO.'})).toBeVisible()
    await page.goto('/panel/logout')
    await expect(page.getByRole('heading',{name:'Panel administrativo'})).toBeVisible()
    expect((await page.request.get('/api/panel/session')).status()).toBe(401)
  })

  test('unauthenticated CMS mutations are refused, and a forged Access header grants nothing on /api/panel',async({request})=>{
    const before=await publicHome(request)
    const attempts:[string,string,any?][]=[
      ['PUT','/products/x',{product:{id:'x'}}],['PATCH','/products/x/status',{status:'active'}],['POST','/products/x/duplicate'],
      ['PUT','/home',{heroHeadline:'HACKED'}],['PUT','/settings',{storeStatus:'live'}],['PUT','/taxonomy/categories',{name:'x',slug:'x'}],
      ['POST','/media/reorder',{ids:['a']}],['DELETE','/media/x'],['POST','/products/x/media'],['GET','/catalog'],['GET','/session'],
    ]
    for(const [method,path,data] of attempts){
      const opts={data,headers:{'cf-connecting-ip':nextIp()}}
      expect((await request.fetch('/api/panel'+path,{method,...opts})).status(),`panel ${method} ${path}`).toBe(401)
      expect((await request.fetch('/api/panel'+path,{method,data,headers:{...FORGED_ACCESS}})).status(),`panel+forged ${method} ${path}`).toBe(401)
      expect((await request.fetch('/api/demo'+path,{method,data,headers:{...FORGED_ACCESS}})).status(),`demo+forged ${method} ${path}`).toBe(401)
      expect((await request.fetch('/api/admin'+path,{method,data})).status(),`admin ${method} ${path}`).toBe(403)
    }
    expect(await publicHome(request)).toBe(before)
  })

  test('an authenticated client session performs real writes through /api/panel',async({page,request})=>{
    await uiLogin(page,'/panel','administrador',NEW_PASSWORD)
    await expect(page.getByRole('heading',{name:'CATÁLOGO.'})).toBeVisible()
    const catalog=await (await page.request.get('/api/panel/catalog')).json()
    const original=catalog.homepage
    const changed=await page.request.put('/api/panel/home',{data:{...original,heroSubheadline:'Texto de prueba V4.9'}})
    expect(changed.status()).toBe(200)
    expect((await (await request.get('/api/catalog')).json()).homepage.heroSubheadline).toBe('Texto de prueba V4.9')
    expect((await page.request.put('/api/panel/home',{data:original})).status()).toBe(200)
    expect((await (await request.get('/api/catalog')).json()).homepage.heroSubheadline).toBe(original.heroSubheadline)
  })
})

test.describe('demo panel',()=>{
  test.use({extraHTTPHeaders:{'cf-connecting-ip':'198.51.100.20'}})

  test('/demo/panel requires its own branded login, marked MODO DEMO, and is not indexable',async({page,request})=>{
    await page.goto('/demo/panel')
    await expect(page.getByRole('heading',{name:'Panel administrativo'})).toBeVisible()
    await expect(page.locator('.demo-pill')).toHaveText('MODO DEMO')
    await expect(page).toHaveTitle('MODO DEMO · Panel administrativo · EL PUNTO')
    expect(await page.locator('body').innerText()).not.toMatch(/cloudflare|google|oauth|zero trust|access\b|token/i)
    for(const path of ['/demo/panel','/demo/panel/products']){
      const res=await request.get(path)
      expect(res.headers()['x-robots-tag'],path).toContain('noindex')
      expect(await res.text(),path).toMatch(/<meta name="robots" content="noindex,nofollow,noarchive"/)
    }
    expect((await request.get('/api/demo/catalog')).status()).toBe(401)
  })

  test('demo and client accounts are not interchangeable',async({request})=>{
    expect((await apiLogin(request,'demo',DEMO_USER,'clave-equivocada')).status()).toBe(401)
    expect((await apiLogin(request,'demo','administrador',NEW_PASSWORD)).status()).toBe(401)
    expect((await apiLogin(request,'panel',DEMO_USER,DEMO_PASS)).status()).toBe(401)
  })

  test('a valid demo login opens the same admin UI with the persistent MODO DEMO strip and fixture data',async({page})=>{
    await uiLogin(page,'/demo/panel',DEMO_USER,DEMO_PASS)
    await expect(page).toHaveURL(/\/demo\/panel\/products$/)
    await expect(page.getByRole('heading',{name:'CATÁLOGO.'})).toBeVisible()
    await expect(page.locator('.demo-strip')).toContainText('MODO DEMO')
    await expect(page.locator('.admin-product-list article').first()).toBeVisible()
    expect(await page.locator('.admin-nav a').evaluateAll(a=>a.map(x=>x.getAttribute('href')))).toEqual(['/demo/panel/products','/demo/panel/home','/demo/panel/settings'])
    await page.locator('.admin-nav a',{hasText:'HOME'}).click()
    await expect(page.locator('.demo-strip')).toBeVisible()
    const catalog=await (await page.request.get('/api/demo/catalog')).json()
    expect(catalog.products.length).toBeGreaterThan(0)
    expect(catalog.site).toMatchObject({brandName:'EL PUNTO — DEMO',email:null,instagram:null,whatsapp:null,shopifyEnabled:false})
    expect(JSON.stringify(catalog)).not.toMatch(/shpat_|shopify_storefront|password|secret/i)
  })

  test('demo mutations are refused server-side and cannot reach production data',async({page,request})=>{
    const before=await publicHome(request)
    await uiLogin(page,'/demo/panel',DEMO_USER,DEMO_PASS)
    await expect(page.getByRole('heading',{name:'CATÁLOGO.'})).toBeVisible()
    const attempts:[string,string,any?][]=[
      ['PUT','/home',{heroHeadline:'HACKED'}],['PUT','/settings',{storeStatus:'live'}],['PUT','/products/x',{product:{id:'x'}}],
      ['PATCH','/products/x/status',{status:'archived'}],['POST','/products/x/duplicate'],['PUT','/taxonomy/categories',{name:'x',slug:'x'}],
      ['POST','/media/reorder',{ids:['a']}],['DELETE','/media/x'],['POST','/home/editorial-image'],['PUT','/anything-else',{}],
    ]
    for(const [method,path,data] of attempts){
      const res=await page.request.fetch('/api/demo'+path,{method,data})
      expect(res.status(),`${method} ${path}`).toBe(403)
      expect(await res.json()).toMatchObject({error:DEMO_MESSAGE,demo:true})
    }
    // The visible path: edit and save from the UI.
    await page.goto('/demo/panel/home')
    const headline=page.getByLabel('Titular')
    await headline.fill('HACKED DESDE LA DEMO')
    await page.getByRole('button',{name:'GUARDAR',exact:true}).click()
    await expect(page.getByText(DEMO_MESSAGE)).toBeVisible()
    expect(await publicHome(request)).toBe(before)
    const real=await (await request.get('/api/catalog')).json()
    expect(JSON.stringify(real)).not.toMatch(/HACKED/)
  })

  test('a demo session cannot use the real protected APIs',async({page})=>{
    await uiLogin(page,'/demo/panel',DEMO_USER,DEMO_PASS)
    await expect(page.getByRole('heading',{name:'CATÁLOGO.'})).toBeVisible()
    expect((await page.request.get('/api/panel/catalog')).status()).toBe(401)
    expect((await page.request.get('/api/panel/session')).status()).toBe(401)
    expect((await page.request.put('/api/panel/home',{data:{heroHeadline:'x'}})).status()).toBe(401)
    expect((await page.request.get('/api/admin/catalog')).status()).toBe(403)
    expect((await page.request.put('/api/admin/home',{data:{heroHeadline:'x'}})).status()).toBe(403)
    const cookie=await sessionCookie(page,'ep_demo')
    expect(cookie).toMatchObject({httpOnly:true,sameSite:'Lax',path:'/api/demo'})
    expect(await sessionCookie(page,'ep_panel')).toBeUndefined()
  })

  test('demo logout invalidates the demo session',async({page})=>{
    await uiLogin(page,'/demo/panel',DEMO_USER,DEMO_PASS)
    await expect(page.locator('.demo-strip')).toBeVisible()
    await page.getByRole('button',{name:'SALIR'}).click()
    await expect(page.getByRole('heading',{name:'Panel administrativo'})).toBeVisible()
    expect((await page.request.get('/api/demo/catalog')).status()).toBe(401)
  })
})

test.describe('Cloudflare Access fallback (/admin) stays as it was',()=>{
  test('without Access the existing gate message and 403 remain; with an Access identity the original admin loads',async({browser,request})=>{
    expect((await request.get('/api/admin/session')).status()).toBe(403)
    const bare=await browser.newPage()
    await bare.goto('/admin')
    await expect(bare.getByText('Esta zona requiere autenticación con Cloudflare Access.')).toBeVisible()
    await bare.close()

    const context=await browser.newContext({extraHTTPHeaders:FORGED_ACCESS})
    const page=await context.newPage()
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/products$/)
    await expect(page.getByRole('heading',{name:'CATÁLOGO.'})).toBeVisible()
    expect(await page.locator('.admin-nav a').evaluateAll(a=>a.map(x=>x.getAttribute('href')))).toEqual(['/admin/products','/admin/home','/admin/settings'])
    await expect(page.locator('.demo-strip')).toHaveCount(0)
    expect((await page.request.get('/api/admin/catalog')).status()).toBe(200)
    await context.close()
  })
})

test.describe('SEO',()=>{
  test('the public storefront stays indexable; only /panel and /demo are not',async({request})=>{
    const home=await request.get('/')
    expect(home.headers()['x-robots-tag']).toBeUndefined()
    const html=await home.text()
    expect(html).toContain('<meta name="robots" content="index,follow"')
    expect(html).toContain('<meta name="googlebot" content="index,follow"')
    expect(html).not.toMatch(/noindex/i)
    expect(await (await request.get('/robots.txt')).text()).toContain('Allow: /')
    for(const path of ['/shop','/product/anything']){
      const res=await request.get(path)
      expect(res.headers()['x-robots-tag'],path).toBeUndefined()
      expect(await res.text(),path).toContain('content="index,follow"')
    }
  })
})

for(const [width,height] of [[390,844],[430,900],[1440,1000]] as const)test.describe(`login usable @${width}`,()=>{
  test.use({viewport:{width,height},extraHTTPHeaders:{'cf-connecting-ip':`198.51.100.${width%200}`}})
  for(const base of ['/panel','/demo/panel'])test(`${base}`,async({page})=>{
    await page.goto(base)
    const user=page.getByLabel('Usuario',{exact:true}),pass=page.getByLabel('Contraseña',{exact:true}),button=page.getByRole('button',{name:'INGRESAR'})
    for(const el of [user,pass,button]){await expect(el).toBeVisible();await expect(el).toBeInViewport()}
    await user.fill('probe-'+width);await pass.fill('x')
    await expect(button).toBeEnabled()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    const box=await button.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(await user.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
  })
})
