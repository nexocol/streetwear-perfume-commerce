import { brand, sizeGuide } from './data.js';
import { store, addToCart, hydrateCart, changeCartQuantity, removeCartItem } from './store.js';

const root=document.querySelector('#app');
const toast=document.querySelector('#toast');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer=matchMedia('(pointer:fine)').matches;
const money=v=>v==null?'CONSULTAR':new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v);
const productBySlug=slug=>store.products().find(p=>p.slug===slug);
const productById=id=>store.products().find(p=>p.id===id);
const pad=n=>String(n).padStart(2,'0');

function getProduct(id,fallbackPredicate=()=>true){
  return productById(id)||store.products().find(fallbackPredicate)||store.products()[0];
}

function showToast(message){
  if(!toast)return;
  toast.textContent=message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>toast.classList.remove('visible'),1600);
}

function setBodyLock(){
  document.body.classList.toggle('is-locked',document.body.classList.contains('cart-open')||document.body.classList.contains('menu-open'));
}

function closeMenu(){document.body.classList.remove('menu-open');setBodyLock()}
function closeCart(){document.body.classList.remove('cart-open');setBodyLock()}
function openCart(){
  document.body.classList.add('cart-open');setBodyLock();
  requestAnimationFrame(()=>document.querySelector('[data-cart-close]')?.focus());
}

function scrollToHash(hash){
  if(!hash)return;
  const target=document.querySelector(hash);
  if(target) target.scrollIntoView({behavior:reducedMotion?'auto':'smooth',block:'start'});
}

function navigate(href){
  const url=new URL(href,location.origin);
  closeMenu();closeCart();
  history.pushState({},'',url.pathname+url.search+url.hash);
  render();
  if(url.hash){
    requestAnimationFrame(()=>requestAnimationFrame(()=>scrollToHash(url.hash)));
  }else{
    scrollTo({top:0,behavior:reducedMotion?'auto':'smooth'});
  }
}

function nav(){
  const count=store.cart().reduce((n,i)=>n+i.quantity,0);
  return `<header class="nav" data-header>
    <button class="nav-menu" data-menu aria-label="Abrir menú">MENU</button>
    <a href="/" data-link class="brand" data-cursor="OPEN"><strong>${brand.placeholder}</strong><span>${brand.season}</span></a>
    <nav aria-label="Principal">
      <a href="/shop" data-link data-cursor="SHOP">SHOP</a>
      <a href="/#fragrance" data-link data-cursor="OPEN">FRAGRANCE</a>
      <a href="/#editorial" data-link data-cursor="OPEN">EDITORIAL</a>
    </nav>
    <div class="nav-actions"><button data-cart data-cursor="OPEN" aria-label="Abrir carrito">BAG <span>${count}</span></button></div>
  </header>
  <aside class="mobile-menu" data-mobile-menu aria-hidden="true">
    <div class="mobile-menu-top"><span>${brand.placeholder}</span><button data-menu aria-label="Cerrar menú">×</button></div>
    <nav>
      <a href="/shop" data-link>SHOP</a>
      <a href="/#fragrance" data-link>FRAGRANCE</a>
      <a href="/#editorial" data-link>EDITORIAL</a>
    </nav>
    <small>${brand.season} / CLIENT REVIEW V2</small>
  </aside>`;
}

function card(p,i=0){
  const hero=p.media[0]?.src||'';
  const second=p.media[1]?.src||hero;
  const multi=(p.variants||[]).length>1;
  const badges=[p.newArrival?'NEW':'',p.bestSeller?'MOST WANTED':''].filter(Boolean);
  return `<article class="card ${i%2?'offset':''}" data-reveal="card" style="--i:${i%4}">
    <button class="media" data-product="${p.slug}" data-cursor="VIEW" aria-label="Ver ${p.name}">
      <img src="${hero}" alt="${p.media[0]?.alt||p.name}" loading="lazy" decoding="async">
      <img class="secondary" src="${second}" alt="" loading="lazy" decoding="async">
      <span class="index">${pad(i+1)}</span>
      <div class="badges">${badges.map(b=>`<span>${b}</span>`).join('')}</div>
      <span class="focus">VIEW</span>
    </button>
    <div class="meta"><div><button data-product="${p.slug}" data-cursor="VIEW"><h3>${p.name}</h3></button><p>${p.subtitle}</p></div><b>${money(p.price)}</b></div>
    <div class="card-actions"><button data-quick="${p.id}" data-cursor="ADD" aria-expanded="false">QUICK ADD ↗</button><span aria-hidden="true">♡</span></div>
    ${multi?`<div class="quick-picker" data-quick-picker="${p.id}" hidden>
      <div class="quick-picker-head"><span>SELECT SIZE</span><button data-quick-close aria-label="Cerrar selector">×</button></div>
      <div class="quick-sizes">${p.variants.map(v=>`<button data-quick-size="${v.id}">${v.size}</button>`).join('')}</div>
      <button class="quick-confirm" data-quick-confirm="${p.id}" disabled data-cursor="ADD">ADD</button>
    </div>`:''}
  </article>`;
}

function homePage(){
  const cfg=store.home();
  const ps=store.products();
  const hero=getProduct(cfg.heroProductId,p=>p.category==='Jeans');
  const secondary=getProduct(cfg.heroSecondaryProductId,p=>p.id!==hero?.id&&p.category==='Jeans');
  const featured=(cfg.featuredIds||[]).map(productById).filter(Boolean);
  const featuredSafe=(featured.length?featured:ps.filter(p=>p.featured)).slice(0,4);
  const fragrancePrimary=getProduct(cfg.fragrancePrimaryId,p=>p.category==='Perfumes');
  const fragranceSecondary=getProduct(cfg.fragranceSecondaryId,p=>p.category==='Perfumes'&&p.id!==fragrancePrimary?.id);
  const editorial=getProduct(cfg.editorialProductId,p=>p.category==='Streetwear');
  const lines=(cfg.heroHeadline||'WEAR THE\nATTITUDE.').split('\n');
  return `<main id="main">
    <section class="hero" data-hero>
      <div class="hero-brand-block" data-reveal="meta"><span>01 / CAMPAIGN</span><strong>${brand.placeholder}</strong><small>${brand.season}</small></div>
      <div class="hero-copy">
        <span class="eyebrow">DROP 001 / STREETWEAR + FRAGRANCE</span>
        <h1 class="hero-title" aria-label="${lines.join(' ')}">${lines.map((line,i)=>`<span class="hero-line"><span style="--line:${i}">${line}</span></span>`).join('')}</h1>
        <p>${cfg.heroSubheadline}</p>
        <div class="hero-actions"><a href="/shop" data-link data-magnetic data-cursor="SHOP" class="btn dark">SHOP THE DROP</a><button data-product="${hero.slug}" data-cursor="VIEW">EXPLORE DENIM ↗</button></div>
      </div>
      <div class="hero-visuals">
        <button class="hero-main-frame" data-product="${hero.slug}" data-cursor="VIEW" data-depth="1" aria-label="Ver ${hero.name}">
          <img src="${hero.media[0].src}" alt="${hero.media[0].alt}" fetchpriority="high" decoding="async">
          <span class="hero-visual-label">HERO / ${hero.category}</span>
        </button>
        ${secondary?`<button class="hero-secondary" data-product="${secondary.slug}" data-cursor="VIEW" data-depth="-1" aria-label="Ver ${secondary.name}"><img src="${secondary.media[0].src}" alt="${secondary.media[0].alt}" decoding="async"><span>02 / SECONDARY</span></button>`:''}
      </div>
      <span class="hero-side-label">COLOMBIA / 2026 / 001</span>
    </section>
    <div class="ticker" aria-hidden="true"><div>STREETWEAR — DENIM — FRAGRANCE — DROP 001 — STREETWEAR — DENIM — FRAGRANCE — DROP 001 —</div></div>
    <section class="section featured-section">
      <div class="heading" data-reveal="mask"><div><span>02</span><p>FEATURED DROP</p></div><h2><span>OBJECTS</span><br><span>OF DESIRE</span></h2><a href="/shop" data-link data-cursor="SHOP">VIEW ALL ↗</a></div>
      <div class="grid">${featuredSafe.map(card).join('')}</div>
    </section>
    <section class="collections">
      <div data-reveal="mask"><span>03 / COLLECTIONS</span><h2><span>SHOP BY</span><br><span>ATTITUDE.</span></h2></div>
      <div class="collection-links" data-reveal="list">
        <a href="/shop?cat=Jeans" data-link data-cursor="SHOP"><span>01</span> DENIM <b>↗</b></a>
        <a href="/shop?cat=Streetwear" data-link data-cursor="SHOP"><span>02</span> GRAPHIC <b>↗</b></a>
        <a href="/shop?cat=Perfumes" data-link data-cursor="SHOP"><span>03</span> FRAGRANCE <b>↗</b></a>
      </div>
    </section>
    <section id="fragrance" class="fragrance" data-fragrance>
      <div class="fragrance-img" data-depth="1"><img src="${fragrancePrimary.media[0].src}" alt="${fragrancePrimary.media[0].alt}" loading="lazy" decoding="async"></div>
      <div class="fragrance-copy" data-reveal="mask"><span>04 / FRAGRANCE EDIT</span><h2><span>SCENT</span><br><span>AFTER</span><br><span>DARK.</span></h2><p>Una edición de fragancias con un ritmo más sensorial, atmosférico y refinado.</p><button data-product="${fragrancePrimary.slug}" data-magnetic data-cursor="VIEW" class="btn light">EXPLORE FRAGRANCE</button></div>
      ${fragranceSecondary?`<button class="fragrance-mini" data-product="${fragranceSecondary.slug}" data-cursor="VIEW" data-depth="-1"><img src="${fragranceSecondary.media[0].src}" alt="${fragranceSecondary.media[0].alt}" loading="lazy" decoding="async"><span>SECOND SCENT ↗</span></button>`:''}
    </section>
    <section id="editorial" class="editorial">
      <div class="editorial-word" data-reveal="mask"><span>NO</span><br><span>UNIFORM.</span></div>
      <div class="editorial-img" data-reveal="image"><img src="${editorial.media[1]?.src||editorial.media[0].src}" alt="${editorial.media[1]?.alt||editorial.media[0].alt}" loading="lazy" decoding="async"></div>
      <div class="editorial-note" data-reveal="meta"><span>05 / LOOKBOOK</span><p>Fotografía, tipografía y movimiento forman la narrativa sin esconder la compra.</p><a href="/shop" data-link data-cursor="SHOP">ENTER STORE ↗</a></div>
    </section>
  </main>`;
}

function shopPage(){
  const params=new URLSearchParams(location.search);
  const cat=params.get('cat')||'Todos';
  const all=store.products();
  const cats=['Todos',...new Set(all.map(p=>p.category))];
  const list=cat==='Todos'?all:all.filter(p=>p.category===cat);
  return `<main id="main"><section class="shop-hero"><span>SHOP / ALL PRODUCTS</span><h1><span class="hero-line"><span>THE</span></span><br><span class="hero-line"><span>EDIT.</span></span></h1><p>${list.length} PIECES / DROP 001</p></section>
    <div class="filters" aria-label="Filtros">${cats.map(c=>`<button class="${c===cat?'active':''}" data-cat="${c}">${c}</button>`).join('')}</div>
    <section class="catalog">${list.map(card).join('')}</section></main>`;
}

function productPage(slug){
  const p=productBySlug(slug); if(!p)return notFound();
  const single=(p.variants||[]).length===1;
  return `<main id="main" class="pdp">
    <section class="gallery" data-gallery data-cursor="DRAG">${p.media.map((m,i)=>`<figure class="${i===0?'hero-shot':''}" data-gallery-slide="${i}"><img src="${m.src}" alt="${m.alt||p.name}" ${i===0?'fetchpriority="high"':'loading="lazy"'} decoding="async"></figure>`).join('')}<div class="gallery-indicator"><span data-gallery-current>01</span> / ${pad(p.media.length)}</div></section>
    <aside class="pdp-info"><span>${p.category} / ${p.fit||'EDITION'}</span><h1>${p.name}</h1><p class="subtitle">${p.subtitle}</p><div class="price">${money(p.price)}</div><p>${p.description}</p>
      <div class="product-facts"><div><span>FIT</span><b>${p.fit||'—'}</b></div><div><span>AVAILABILITY</span><b>CONSULTAR</b></div></div>
      <div class="size-heading"><span>${single?'OPTION':'SELECT SIZE'}</span>${p.category==='Jeans'?'<button class="text-link" data-size-guide>GUÍA DE TALLAS ↗</button>':''}</div>
      <div class="sizes">${p.variants.map(v=>`<button class="${single?'selected':''}" data-size="${v.id}" aria-pressed="${single?'true':'false'}">${v.size}</button>`).join('')}</div>
      <button class="btn dark wide add-button" data-add="${p.id}" data-cursor="ADD" ${single?'':'disabled'}>${single?'ADD TO BAG':'SELECT SIZE'}</button>
      <details open><summary>PRODUCT DETAILS <span>+</span></summary><ul>${p.features.length?p.features.map(f=>`<li>${f}</li>`).join(''):'<li>Detalles comerciales adicionales por confirmar.</li>'}</ul></details>
      <details><summary>CAMBIOS <span>+</span></summary><p>La prenda debe regresar sin uso, manchas, daños, modificaciones u olores, con etiquetas y elementos originales. El costo de envío del cambio lo asume el cliente.</p></details>
    </aside>
  </main>`;
}

function adminPage(){
  const ps=store.products();
  return `<main id="main" class="admin">
    <aside class="admin-side"><a href="/" data-link class="admin-logo">CMS</a><div class="prototype-badge">UI / PROTOTYPE</div><nav><button class="active">PRODUCTOS</button><button disabled>HOME</button><button disabled>COLLECTIONS</button></nav><small>CMS BACKEND — NEXT PHASE</small></aside>
    <section class="admin-main"><div class="admin-notice"><b>CLIENT REVIEW MODE</b><span>Esta pantalla valida la UX del CMS. Crear/editar se habilitará con backend, auth y base de datos en la siguiente fase.</span></div><header><div><span>ADMIN / CONTENT SYSTEM</span><h1>CATALOG.</h1></div><button class="btn dark" disabled title="CMS backend — next phase">+ NEW PRODUCT</button></header>
      <div class="admin-table">${ps.map(p=>`<div class="admin-row"><img src="${p.media[0].src}" alt=""><div><b>${p.name}</b><small>${p.subtitle}</small></div><span>${p.category}</span><span>${p.featured?'FEATURED':'STANDARD'}</span><button disabled title="CMS backend — next phase">EDIT</button></div>`).join('')}</div>
      <div class="architecture"><span>ARCHITECTURE</span><b>CUSTOM STOREFRONT</b><i>↓</i><b>CONTROLLED CMS</b><i>↓</i><b>SHOPIFY COMMERCE LAYER</b><i>↓</i><b>SHOPIFY CHECKOUT</b></div>
    </section>
  </main>`;
}

function notFound(){return `<main id="main" class="notfound"><span>404</span><h1>NOT<br>FOUND.</h1><a href="/" data-link class="btn dark">BACK HOME</a></main>`}

function cart(){
  const items=hydrateCart();
  const unitPrice=i=>i.variant?.price??i.product?.price;
  const allPriced=items.length>0&&items.every(i=>Number.isFinite(unitPrice(i)));
  const subtotal=allPriced?items.reduce((s,i)=>s+unitPrice(i)*i.quantity,0):null;
  const count=items.reduce((n,i)=>n+i.quantity,0);
  return `<div class="backdrop" data-cart-close></div><aside class="cart" data-cart-panel aria-label="Carrito" aria-hidden="${document.body.classList.contains('cart-open')?'false':'true'}"><header><span>BAG / ${count}</span><button data-cart-close aria-label="Cerrar carrito">×</button></header><div class="cart-items">${items.length?items.map(i=>`<article class="cart-item"><img src="${i.product.media[0].src}" alt="${i.product.name}"><div class="cart-item-info"><b>${i.product.name}</b><span>SIZE / ${i.variant.size}</span><strong>${money(unitPrice(i))}</strong><div class="quantity"><button data-cart-dec="${i.key}" aria-label="Restar cantidad">−</button><span>${i.quantity}</span><button data-cart-inc="${i.key}" aria-label="Sumar cantidad">+</button></div><button class="remove" data-cart-remove="${i.key}">REMOVE</button></div></article>`).join(''):'<div class="empty-cart"><span>YOUR BAG IS EMPTY.</span><a href="/shop" data-link>SHOP THE DROP ↗</a></div>'}</div><footer><div><span>SUBTOTAL</span><b>${subtotal==null?'CONSULTAR':money(subtotal)}</b></div><button class="btn light wide" disabled>CHECKOUT — PRÓXIMAMENTE</button></footer></aside>`;
}

function sizeModal(){
  return `<dialog id="size-dialog" aria-labelledby="size-title"><button class="dialog-close" data-dialog-close aria-label="Cerrar guía">×</button><span>SIZE SYSTEM</span><h2 id="size-title">${sizeGuide.title}</h2><div class="size-table"><div class="size-row head">${sizeGuide.headers.map(x=>`<b>${x}</b>`).join('')}</div>${sizeGuide.rows.map(r=>`<div class="size-row">${r.map(x=>`<span>${x}</span>`).join('')}</div>`).join('')}</div><p>${sizeGuide.note}</p></dialog>`;
}

function footer(){return `<footer class="footer"><div class="footer-big">NOT FOR EVERYONE.</div><div class="footer-grid"><div><span>SHOP</span><a href="/shop" data-link>All products</a><a href="/shop?cat=Jeans" data-link>Denim</a></div><div><span>INFO</span><p>Changes</p><p>Shipping</p></div><div><span>DROP</span><p>Collection 001</p></div><div><b>${brand.placeholder}</b><small>CLIENT REVIEW / 2026</small></div></div></footer>`}

function render(){
  const path=location.pathname;
  const page=path==='/'?homePage():path==='/shop'?shopPage():path.startsWith('/product/')?productPage(path.split('/').pop()):path==='/admin'?adminPage():notFound();
  root.innerHTML=nav()+page+footer()+cart()+sizeModal();
  bind();reveal();setupParallax();setupMagnetic();setupGalleryIndicator();syncHeader();
  if(location.hash) requestAnimationFrame(()=>requestAnimationFrame(()=>scrollToHash(location.hash)));
}

function bind(){
  document.querySelectorAll('[data-link]').forEach(a=>a.onclick=e=>{e.preventDefault();navigate(a.getAttribute('href'))});
  document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>navigate('/product/'+b.dataset.product));
  document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>navigate('/shop?cat='+encodeURIComponent(b.dataset.cat)));
  document.querySelectorAll('[data-menu]').forEach(b=>b.onclick=()=>{
    const opening=!document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open');setBodyLock();
    document.querySelector('[data-mobile-menu]')?.setAttribute('aria-hidden',opening?'false':'true');
  });
  document.querySelectorAll('[data-cart]').forEach(b=>b.onclick=openCart);
  document.querySelectorAll('[data-cart-close]').forEach(b=>b.onclick=closeCart);
  document.querySelectorAll('[data-size-guide]').forEach(b=>b.onclick=()=>document.querySelector('#size-dialog')?.showModal());
  document.querySelectorAll('[data-dialog-close]').forEach(b=>b.onclick=()=>b.closest('dialog')?.close());

  document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{
    const p=productById(b.dataset.quick); if(!p)return;
    if((p.variants||[]).length===1){addToCart(p.id,p.variants[0].id);showToast(`${p.name} added`);render();openCart();return}
    document.querySelectorAll('[data-quick-picker]').forEach(picker=>{if(picker.dataset.quickPicker!==p.id)picker.hidden=true});
    const picker=document.querySelector(`[data-quick-picker="${p.id}"]`); if(!picker)return;
    picker.hidden=!picker.hidden;b.setAttribute('aria-expanded',String(!picker.hidden));
  });
  document.querySelectorAll('[data-quick-close]').forEach(b=>b.onclick=()=>{const picker=b.closest('[data-quick-picker]');picker.hidden=true});
  document.querySelectorAll('[data-quick-size]').forEach(b=>b.onclick=()=>{
    const picker=b.closest('[data-quick-picker]');picker.querySelectorAll('[data-quick-size]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');picker.dataset.variant=b.dataset.quickSize;picker.querySelector('[data-quick-confirm]').disabled=false;
  });
  document.querySelectorAll('[data-quick-confirm]').forEach(b=>b.onclick=()=>{
    const picker=b.closest('[data-quick-picker]');const variantId=picker.dataset.variant;if(!variantId)return;
    const product=productById(b.dataset.quickConfirm);if(addToCart(product.id,variantId)){showToast(`${product.name} / ${picker.querySelector('.selected')?.textContent||''} added`);render();openCart()}
  });

  document.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{
    const wrap=b.parentElement;wrap.querySelectorAll('button').forEach(x=>{x.classList.remove('selected');x.setAttribute('aria-pressed','false')});b.classList.add('selected');b.setAttribute('aria-pressed','true');
    const add=document.querySelector('[data-add]');if(add){add.disabled=false;add.textContent='ADD TO BAG';add.dataset.variant=b.dataset.size}
  });
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{
    const p=productById(b.dataset.add);const selected=b.dataset.variant||document.querySelector('[data-size].selected')?.dataset.size;
    if(addToCart(p.id,selected)){b.textContent='ADDED ✓';showToast(`${p.name} added`);setTimeout(()=>{render();openCart()},260)}
  });

  document.querySelectorAll('[data-cart-dec]').forEach(b=>b.onclick=()=>{changeCartQuantity(b.dataset.cartDec,-1);render();openCart()});
  document.querySelectorAll('[data-cart-inc]').forEach(b=>b.onclick=()=>{changeCartQuantity(b.dataset.cartInc,1);render();openCart()});
  document.querySelectorAll('[data-cart-remove]').forEach(b=>b.onclick=()=>{removeCartItem(b.dataset.cartRemove);render();openCart()});
}

function reveal(){
  if(reducedMotion){document.querySelectorAll('[data-reveal]').forEach(el=>el.classList.add('visible'));return}
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');io.unobserve(entry.target)}}),{threshold:.12});
  document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));
}

function setupParallax(){
  if(!finePointer||reducedMotion)return;
  document.querySelectorAll('[data-hero],[data-fragrance]').forEach(section=>{
    section.onpointermove=e=>{
      const r=section.getBoundingClientRect();const nx=(e.clientX-r.left)/r.width-.5;const ny=(e.clientY-r.top)/r.height-.5;
      section.querySelectorAll('[data-depth]').forEach(layer=>{const depth=Number(layer.dataset.depth||1);layer.style.setProperty('--px',`${nx*8*depth}px`);layer.style.setProperty('--py',`${ny*6*depth}px`)});
    };
    section.onpointerleave=()=>section.querySelectorAll('[data-depth]').forEach(layer=>{layer.style.setProperty('--px','0px');layer.style.setProperty('--py','0px')});
  });
}

function setupMagnetic(){
  if(!finePointer||reducedMotion)return;
  document.querySelectorAll('[data-magnetic]').forEach(el=>{
    el.onpointermove=e=>{const r=el.getBoundingClientRect();el.style.setProperty('--mx',`${(e.clientX-r.left-r.width/2)*.08}px`);el.style.setProperty('--my',`${(e.clientY-r.top-r.height/2)*.1}px`)};
    el.onpointerleave=()=>{el.style.setProperty('--mx','0px');el.style.setProperty('--my','0px')};
  });
}

function setupGalleryIndicator(){
  const gallery=document.querySelector('[data-gallery]');const current=document.querySelector('[data-gallery-current]');if(!gallery||!current)return;
  const slides=[...gallery.querySelectorAll('[data-gallery-slide]')];
  const update=()=>{const center=gallery.scrollLeft+gallery.clientWidth/2;let best=0,bestDist=Infinity;slides.forEach((s,i)=>{const c=s.offsetLeft+s.offsetWidth/2;const d=Math.abs(c-center);if(d<bestDist){best=i;bestDist=d}});current.textContent=pad(best+1)};
  gallery.addEventListener('scroll',update,{passive:true});update();
}

function syncHeader(){
  const header=document.querySelector('[data-header]');if(!header)return;
  const sample=document.elementsFromPoint(innerWidth/2,Math.min(header.offsetHeight+8,innerHeight-1)).find(el=>!el.closest?.('[data-header]'));
  const dark=Boolean(sample?.closest?.('.fragrance,.footer,.mobile-menu'));
  header.classList.toggle('inverse',dark);header.classList.toggle('scrolled',scrollY>16);
}

function initGlobalInteractions(){
  addEventListener('scroll',syncHeader,{passive:true});
  addEventListener('resize',syncHeader,{passive:true});
  addEventListener('popstate',render);
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    closeMenu();closeCart();document.querySelector('dialog[open]')?.close();document.querySelectorAll('[data-quick-picker]').forEach(p=>p.hidden=true);
  });
  const cursor=document.querySelector('#cursor');if(!cursor||!finePointer)return;
  const label=cursor.querySelector('span');
  addEventListener('pointermove',e=>{cursor.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`});
  document.addEventListener('pointerover',e=>{
    const target=e.target.closest('[data-cursor],a,button');const state=target?.dataset.cursor||(target?'OPEN':'');
    cursor.classList.toggle('active',Boolean(target));if(label)label.textContent=state;
  });
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget)cursor.classList.remove('active')});
}

initGlobalInteractions();
render();
