import { brand, products, home, sizeGuide } from './data.js';
import { store, addToCart, hydrateCart } from './store.js';

const root=document.querySelector('#app');
const money=v=>v==null?'Precio pendiente':new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v);
const bySlug=slug=>store.products().find(p=>p.slug===slug);
const byId=id=>store.products().find(p=>p.id===id);
const go=path=>{history.pushState({},'',path);render();scrollTo({top:0,behavior:'smooth'})};
const productUrl=p=>'/product/'+p.slug;

function nav(){
  const count=store.cart().reduce((n,i)=>n+i.quantity,0);
  return `<header class="nav">
    <button class="nav-menu" data-menu>MENU</button>
    <a href="/" data-link class="brand"><b>${brand.mark}</b><span>${brand.season}</span></a>
    <nav><a href="/shop" data-link>SHOP</a><a href="/#fragrance" data-link>FRAGRANCE</a><a href="/#editorial" data-link>EDITORIAL</a></nav>
    <div class="nav-actions"><button data-cart> BAG <span>${count}</span></button></div>
  </header>
  <aside class="mobile-menu" data-mobile-menu>
    <button data-menu>×</button>
    <a href="/shop" data-link>SHOP</a>
    <a href="/#fragrance" data-link>FRAGRANCE</a>
    <a href="/admin" data-link>ADMIN / CMS</a>
  </aside>`;
}

function card(p,i=0){
  const hero=p.media[0]?.src||'';
  const second=p.media[1]?.src||hero;
  return `<article class="card ${i%2?'offset':''}" data-reveal>
    <button class="media" data-product="${p.slug}">
      <img src="${hero}" alt="${p.media[0]?.alt||p.name}" loading="lazy">
      <img class="secondary" src="${second}" alt="" loading="lazy">
      <span class="index">0${i+1}</span>
      <span class="focus">VIEW</span>
    </button>
    <div class="meta"><div><button data-product="${p.slug}"><h3>${p.name}</h3></button><p>${p.subtitle}</p></div><b>${money(p.price)}</b></div>
    <div class="card-actions"><button data-quick="${p.id}">QUICK ADD ↗</button><span>♡</span></div>
  </article>`;
}

function homePage(){
  const ps=store.products(); const hero=byId(home.heroProductId)||ps[0];
  const featured=ps.filter(p=>p.featured).slice(0,4);
  const perfume=ps.filter(p=>p.category==='Perfumes');
  return `<main id="main">
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">01 / NEW DROP / COLOMBIA</span>
        <h1>${home.heroHeadline.replace('\n','<br>')}</h1>
        <p>${home.heroSubheadline}</p>
        <div class="hero-actions"><a href="/shop" data-link class="btn dark">SHOP THE DROP</a><button data-product="${hero.slug}">VIEW HERO ↗</button></div>
      </div>
      <button class="hero-image" data-product="${hero.slug}"><img src="${hero.media[0].src}" alt="${hero.media[0].alt}"></button>
      <div class="float one"><img src="${ps[2].media[0].src}" alt=""></div>
      <div class="float two"><img src="${ps[4].media[0].src}" alt=""></div>
    </section>
    <div class="ticker"><div>STREETWEAR — DENIM — FRAGRANCE — DROP 001 — STREETWEAR — DENIM — FRAGRANCE — DROP 001 —</div></div>
    <section class="section">
      <div class="heading"><div><span>02</span><p>FEATURED DROP</p></div><h2>OBJECTS<br>OF DESIRE</h2><a href="/shop" data-link>VIEW ALL ↗</a></div>
      <div class="grid">${featured.map(card).join('')}</div>
    </section>
    <section class="collections">
      <div><span>03 / COLLECTIONS</span><h2>SHOP BY<br>ATTITUDE.</h2></div>
      <div class="collection-links">
        <a href="/shop?cat=Jeans" data-link><span>01</span> DENIM <b>↗</b></a>
        <a href="/shop?cat=Streetwear" data-link><span>02</span> GRAPHIC <b>↗</b></a>
        <a href="/shop?cat=Perfumes" data-link><span>03</span> FRAGRANCE <b>↗</b></a>
      </div>
    </section>
    <section id="fragrance" class="fragrance">
      <div class="fragrance-img"><img src="${perfume[0].media[0].src}" alt="${perfume[0].media[0].alt}"></div>
      <div class="fragrance-copy"><span>04 / FRAGRANCE EDIT</span><h2>SCENT<br>AFTER<br>DARK.</h2><p>Las fragancias conservan un lenguaje más sensorial y refinado sin romper la identidad general del storefront.</p><button data-product="${perfume[0].slug}" class="btn light">EXPLORE FRAGRANCE</button></div>
      <div class="fragrance-mini"><img src="${perfume[1].media[0].src}" alt=""></div>
    </section>
    <section id="editorial" class="editorial">
      <div class="editorial-word">NO<br>UNIFORM.</div>
      <div class="editorial-img"><img src="${ps[2].media[1]?.src||ps[2].media[0].src}" alt=""></div>
      <div class="editorial-note"><span>05 / LOOKBOOK</span><p>Fotografía, tipografía y movimiento forman la narrativa sin esconder la compra.</p><a href="/shop" data-link>ENTER STORE ↗</a></div>
    </section>
  </main>`;
}

function shopPage(){
  const params=new URLSearchParams(location.search);
  const cat=params.get('cat')||'Todos';
  const all=store.products();
  const cats=['Todos',...new Set(all.map(p=>p.category))];
  const list=cat==='Todos'?all:all.filter(p=>p.category===cat);
  return `<main id="main"><section class="shop-hero"><span>SHOP / ALL PRODUCTS</span><h1>THE<br>EDIT.</h1><p>${list.length} PRODUCTS / REAL CLIENT ASSETS</p></section>
    <div class="filters">${cats.map(c=>`<button class="${c===cat?'active':''}" data-cat="${c}">${c}</button>`).join('')}</div>
    <section class="catalog">${list.map(card).join('')}</section></main>`;
}

function productPage(slug){
  const p=bySlug(slug); if(!p)return notFound();
  return `<main id="main" class="pdp">
    <section class="gallery">${p.media.map((m,i)=>`<figure class="${i===0?'hero-shot':''}"><img src="${m.src}" alt="${m.alt||p.name}"></figure>`).join('')}</section>
    <aside class="pdp-info"><span>${p.category} / ${p.fit||'EDITION'}</span><h1>${p.name}</h1><p class="subtitle">${p.subtitle}</p><div class="price">${money(p.price)}</div><p>${p.description}</p>
      <div class="sizes">${p.variants.map((v,i)=>`<button class="${i===0?'selected':''}" data-size="${v.id}">${v.size}</button>`).join('')}</div>
      ${p.category==='Jeans'?'<button class="text-link" data-size-guide>GUÍA DE TALLAS ↗</button>':''}
      <button class="btn dark wide" data-add="${p.id}">ADD TO BAG</button>
      <details open><summary>PRODUCT DETAILS</summary><ul>${p.features.map(f=>`<li>${f}</li>`).join('')}</ul></details>
      <details><summary>CAMBIOS</summary><p>La prenda debe regresar sin uso, manchas, daños, modificaciones u olores, con etiquetas y elementos originales. El costo de envío del cambio lo asume el cliente.</p></details>
    </aside>
  </main>`;
}

function adminPage(){
  const ps=store.products();
  return `<main id="main" class="admin">
    <aside class="admin-side"><a href="/" data-link class="admin-logo">B/S</a><nav><button class="active">PRODUCTOS</button><button>HOME</button><button>COLLECTIONS</button></nav><small>CMS CONTROLADO / V1 LOCAL</small></aside>
    <section class="admin-main"><header><div><span>ADMIN / CONTENT SYSTEM</span><h1>CATALOG.</h1></div><button class="btn dark" data-new>+ NEW PRODUCT</button></header>
      <div class="admin-table">${ps.map(p=>`<div class="admin-row"><img src="${p.media[0].src}" alt=""><div><b>${p.name}</b><small>${p.subtitle}</small></div><span>${p.category}</span><span>${p.featured?'FEATURED':'STANDARD'}</span><button data-edit="${p.id}">EDIT</button></div>`).join('')}</div>
      <div class="architecture"><span>ARCHITECTURE</span><b>CUSTOM STOREFRONT</b><i>↓</i><b>CONTROLLED CMS</b><i>↓</i><b>SHOPIFY COMMERCE LAYER</b><i>↓</i><b>SHOPIFY CHECKOUT</b></div>
    </section>
  </main>`;
}

function notFound(){return `<main id="main" class="notfound"><span>404</span><h1>NOT<br>FOUND.</h1><a href="/" data-link class="btn dark">BACK HOME</a></main>`}

function cart(){
  const items=hydrateCart();
  return `<div class="backdrop" data-cart-close></div><aside class="cart" data-cart-panel><header><span>BAG / ${items.length}</span><button data-cart-close>×</button></header><div class="cart-items">${items.length?items.map(i=>`<div class="cart-item"><img src="${i.product.media[0].src}" alt=""><div><b>${i.product.name}</b><span>QTY ${i.quantity}</span><span>${money(i.product.price)}</span></div></div>`).join(''):'<p>Your bag is empty.</p>'}</div><footer><div><span>SUBTOTAL</span><b>Pending prices</b></div><button class="btn light wide">CHECKOUT / SHOPIFY PENDING</button></footer></aside>`;
}

function sizeModal(){
  return `<dialog id="size-dialog"><button class="dialog-close" data-dialog-close>×</button><span>SIZE SYSTEM</span><h2>${sizeGuide.title}</h2><div class="size-table"><div class="size-row head">${sizeGuide.headers.map(x=>`<b>${x}</b>`).join('')}</div>${sizeGuide.rows.map(r=>`<div class="size-row">${r.map(x=>`<span>${x}</span>`).join('')}</div>`).join('')}</div><p>${sizeGuide.note}</p></dialog>`;
}

function footer(){return `<footer class="footer"><div class="footer-big">NOT FOR EVERYONE.</div><div class="footer-grid"><div><span>SHOP</span><a href="/shop" data-link>All products</a><a href="/shop?cat=Jeans" data-link>Denim</a></div><div><span>INFO</span><p>Changes</p><p>Shipping</p></div><div><span>STATUS</span><p>Shopify integration pending</p></div><div><b>B/S</b><small>V1 / 2026</small></div></div></footer>`}

function render(){
  const path=location.pathname;
  let page=path==='/'?homePage():path==='/shop'?shopPage():path.startsWith('/product/')?productPage(path.split('/').pop()):path==='/admin'?adminPage():notFound();
  root.innerHTML=nav()+page+footer()+cart()+sizeModal();
  bind(); reveal();
}

function bind(){
  document.querySelectorAll('[data-link]').forEach(a=>a.onclick=e=>{e.preventDefault();go(a.getAttribute('href'))});
  document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>go('/product/'+b.dataset.product));
  document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>go('/shop?cat='+encodeURIComponent(b.dataset.cat)));
  document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{addToCart(b.dataset.quick);document.body.classList.add('cart-open');render()});
  document.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{b.parentElement.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')});
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const selected=document.querySelector('[data-size].selected')?.dataset.size;addToCart(b.dataset.add,selected);document.body.classList.add('cart-open');render()});
  document.querySelectorAll('[data-cart]').forEach(b=>b.onclick=()=>document.body.classList.add('cart-open'));
  document.querySelectorAll('[data-cart-close]').forEach(b=>b.onclick=()=>document.body.classList.remove('cart-open'));
  document.querySelectorAll('[data-menu]').forEach(b=>b.onclick=()=>document.body.classList.toggle('menu-open'));
  document.querySelectorAll('[data-size-guide]').forEach(b=>b.onclick=()=>document.querySelector('#size-dialog').showModal());
  document.querySelectorAll('[data-dialog-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
}

function reveal(){
  const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('visible')),{threshold:.08});
  document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));
}

addEventListener('popstate',render);
render();