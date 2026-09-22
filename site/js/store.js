import { products as seedProducts, home as seedHome } from './data.js';

const K={products:'commerce.products.v1',home:'commerce.home.v1',cart:'commerce.cart.v1'};
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
  const product=store.products().find(p=>p.id===productId); if(!product)return;
  const variant=product.variants.find(v=>v.id===variantId)||product.variants[0];
  const cart=store.cart(); const key=product.id+':'+variant.id;
  const hit=cart.find(i=>i.key===key);
  if(hit)hit.quantity+=1; else cart.push({key,productId,variantId:variant.id,quantity:1});
  store.setCart(cart);
}

export function hydrateCart(){
  const products=store.products();
  return store.cart().map(i=>({...i,product:products.find(p=>p.id===i.productId)})).filter(i=>i.product);
}