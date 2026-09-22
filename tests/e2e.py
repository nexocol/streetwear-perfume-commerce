from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
site=ROOT/'site'
css=(site/'styles.css').read_text()
data=(site/'js/data.js').read_text().replace('export const ','const ').replace('export function ','function ')
store=(site/'js/store.js').read_text()
store=store.replace("import { products as seedProducts, home as seedHome } from './data.js';","const seedProducts=products; const seedHome=home;")
store=store.replace('export const ','const ').replace('export function ','function ').replace('localStorage','window.virtualStorage')
app=(site/'js/app.js').read_text()
app=app.replace("import { brand, sizeGuide } from './data.js';\n",'').replace("import { store, addToCart, hydrateCart, changeCartQuantity, removeCartItem } from './store.js';\n",'')
app=app.replace('location.origin','window.virtualLocation.origin').replace('location.pathname','window.virtualLocation.pathname').replace('location.search','window.virtualLocation.search').replace('location.hash','window.virtualLocation.hash')
app=app.replace('history.pushState','window.virtualHistory.pushState').replace('history.replaceState','window.virtualHistory.replaceState')
virtual="""
window.virtualStorage={_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(k){delete this._d[k]}};
window.virtualLocation={origin:'https://v25.local',pathname:'/',search:'',hash:''};
window._stack=['/'];window._index=0;
window._applyVirtual=(href)=>{const u=new URL(href,window.virtualLocation.origin);window.virtualLocation.pathname=u.pathname;window.virtualLocation.search=u.search;window.virtualLocation.hash=u.hash;};
window.virtualHistory={
 pushState(_a,_b,href){window._stack=window._stack.slice(0,window._index+1);window._stack.push(href);window._index++;window._applyVirtual(href)},
 replaceState(_a,_b,href){window._stack[window._index]=href;window._applyVirtual(href)},
 back(){if(window._index>0){window._index--;window._applyVirtual(window._stack[window._index])}}
};
"""
script=virtual+data+'\n'+store+'\n'+app
html=f'''<!doctype html><html><head><style>{css}</style></head><body><a class="skip-link" href="#main">Saltar</a><div id="app"></div><div id="cursor"><span>ABRIR</span></div><div id="toast"></div><script>{script}</script></body></html>'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(viewport={"width":1440,"height":900})
    page.route('**/*',lambda route: route.abort())
    page.set_content(html,wait_until='domcontentloaded')
    expect(page.locator('h1')).to_contain_text('DROP / 001')

    page.get_by_role('link',name='TIENDA').first.click()
    expect(page.locator('.catalog')).to_be_visible()
    page.get_by_role('button',name='FILTRAR / ORDENAR').click()
    page.locator('[data-filter-key="cat"][data-filter-value="Jeans"]').click()
    page.locator('[data-filter-apply]').click()
    expect(page.locator('.catalog .card')).to_have_count(2)

    page.locator('.catalog .media').first.click()
    expect(page.locator('.pdp-info h1')).to_contain_text('DENIM')
    page.locator('[data-size]').first.click()
    page.get_by_role('button',name='AGREGAR AL CARRITO').click()
    page.wait_for_timeout(280)
    expect(page.locator('.cart-item')).to_have_count(1)
    page.locator('[data-cart-inc]').click()
    expect(page.locator('.quantity span')).to_have_text('2')
    page.locator('[data-cart-dec]').click()
    expect(page.locator('.quantity span')).to_have_text('1')
    page.locator('[data-cart-remove]').click()
    expect(page.locator('.cart-item')).to_have_count(0)
    page.get_by_role('link',name='VER LA TIENDA').click()
    expect(page.locator('.catalog')).to_be_visible()

    page.evaluate("window.virtualHistory.back(); dispatchEvent(new PopStateEvent('popstate'))")
    expect(page.locator('.pdp-info h1')).to_be_visible()
    page.locator('[data-size-guide]').click()
    expect(page.locator('#size-dialog')).to_be_visible()
    page.locator('#size-dialog [data-dialog-close]').click()

    page.evaluate("window.virtualHistory.replaceState({},'', '/'); dispatchEvent(new PopStateEvent('popstate'))")
    page.get_by_role('link',name='FRAGRANCE').first.click()
    expect(page.locator('#fragrance')).to_be_visible()
    page.get_by_role('link',name='EDITORIAL').first.click()
    expect(page.locator('#editorial')).to_be_visible()

    mobile=browser.new_page(viewport={"width":390,"height":844})
    mobile.route('**/*',lambda route: route.abort())
    mobile.set_content(html,wait_until='domcontentloaded')
    mobile.get_by_role('button',name='Abrir menú').click()
    expect(mobile.locator('.mobile-menu')).to_have_attribute('aria-hidden','false')
    mobile.locator('.mobile-menu a[href="/shop"]').click()
    expect(mobile.locator('.catalog')).to_be_visible()
    mobile.get_by_role('button',name='FILTRAR / ORDENAR').click()
    expect(mobile.locator('.filter-panel')).to_have_attribute('aria-hidden','false')
    mobile.keyboard.press('Escape')
    expect(mobile.locator('.filter-panel')).to_have_attribute('aria-hidden','true')
    browser.close()

print('E2E PASS')
