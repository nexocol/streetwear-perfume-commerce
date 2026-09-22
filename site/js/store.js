import { products as seedProducts, home as seedHome } from './data.js';

const K={products:'commerce.products.v25',home:'commerce.home.v25',cart:'commerce.cart.v25'};
const clone=x=>JSON.parse(JSON.stringify(x));
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??clone(f)}catch{return clone(f)}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

export const store={
  products:()=>read(K.products,seedProducts),
  setProducts:v=>write(K.products,v),
  home:()=>read(K.home,seedHome),
  setHome:v=>write(K.home,v),
  cart:()=>read(K.cart,[]),
  setCart:v=>write(K.cart,v),
  reset:()=>Object.values(K).forEach(k=>localStorage.removeItem(k))
};

export function addToCart(productId,variantId){
  const product=store.products().find(p=>p.id===productId); if(!product)return false;
  const variants=product.variants||[];
  let variant=variants.find(v=>v.id===variantId);
  if(!variant&&variants.length===1)variant=variants[0];
  if(!variant)return false;
  const cart=store.cart();const key=product.id+':'+variant.id;
  const hit=cart.find(i=>i.key===key);
  if(hit)hit.quantity+=1;else cart.push({key,productId,variantId:variant.id,quantity:1});
  store.setCart(cart);return true;
}

export function changeCartQuantity(key,delta){
  const cart=store.cart();const item=cart.find(i=>i.key===key);if(!item)return;
  item.quantity=Math.max(0,item.quantity+delta);store.setCart(cart.filter(i=>i.quantity>0));
}

export function removeCartItem(key){store.setCart(store.cart().filter(i=>i.key!==key))}

export function hydrateCart(){
  const products=store.products();
  return store.cart().map(i=>{
    const product=products.find(p=>p.id===i.productId);
    const variant=product?.variants?.find(v=>v.id===i.variantId);
    return {...i,product,variant};
  }).filter(i=>i.product&&i.variant);
}
