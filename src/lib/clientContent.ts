import type { CatalogSnapshot, Product } from '../types'

export type CommercialTerms={
  codMessage:string
  codBogota:number
  codCundinamarca:number
  codNational:number
  prepaidMessage:string
  prepaidShipping:number
  pickupMessage:string
}

export const DEFAULT_COMMERCIAL_TERMS:CommercialTerms={
  codMessage:'Pagas el valor de tu producto al recibirlo, pero el valor del envío se debe pagar por anticipado.',
  codBogota:15000,
  codCundinamarca:22000,
  codNational:30000,
  prepaidMessage:'Valor total = valor de la prenda + $10.000 de envío.',
  prepaidShipping:10000,
  pickupMessage:'Para apartar tu prenda debes realizar un anticipo de $10.000. Este valor se descuenta del costo total de la prenda. No se cobra costo de envío.'
}

const TERMS_PREFIX='CLIENT_TERMS_V1:'
const LEGACY_SHIPPING='La cobertura, el costo y los tiempos de envío se confirmarán según el destino.'
const legacyName=/^(DENIM|TEE|SET|FRAGRANCE)\s*\/\s*\d+$/i
const genericProvisional=/^(Pantalón — referencia por confirmar|Camiseta — marca por confirmar|Conjunto — marca por confirmar|Perfume — referencia por confirmar)$/i
const categoryLabels:Record<string,string>={
  Jeans:'Pantalones',
  Streetwear:'Camisetas',
  Conjuntos:'Conjuntos',
  Perfumes:'Perfumes',
  Sudaderas:'Sudaderas',
}

export function displayCategory(category:string){
  return categoryLabels[category]||category
}

export function activeCatalogCategories(catalog:CatalogSnapshot){
  return catalog.categories
    .filter(category=>category.enabled&&catalog.products.some(product=>product.status==='active'&&(product.categoryId===category.id||product.category===category.name)))
    .sort((a,b)=>a.sortOrder-b.sortOrder)
}

export function categoryListText(labels:string[]){
  if(!labels.length)return 'Productos'
  if(labels.length===1)return labels[0]
  if(labels.length===2)return labels.join(' y ')
  return labels.slice(0,-1).join(', ')+' y '+labels.at(-1)
}

function isDefaultProvisionalName(product:Product){
  return legacyName.test(product.name)||genericProvisional.test(product.name)
}

export function productStyle(product:Product){
  const source=[product.name,product.subtitle,product.description,...product.features,...product.media.map(m=>m.alt||'')].join(' ').toLowerCase()
  if(source.includes('brillo'))return 'Brillos'
  if(source.includes('roto')||source.includes('distressed'))return 'Rotos'
  if((source.includes('gris')||source.includes('grey'))&&source.includes('lav'))return 'Lavado gris'
  return product.fit||null
}

export function displayProductName(product:Product){
  if(!isDefaultProvisionalName(product))return product.name
  const known:Record<string,string>={
    'denim-01':'Pantalón Rotos',
    'denim-02':'Pantalón Lavado Gris',
    'tee-01':'Camiseta Gráfica',
    'set-01':'Conjunto Negro',
    'perfume-01':'Perfume 01',
    'perfume-02':'Perfume 02',
  }
  if(known[product.id])return known[product.id]
  if(product.category==='Jeans')return 'Pantalón'
  if(product.category==='Streetwear')return 'Camiseta'
  if(product.category==='Conjuntos')return 'Conjunto'
  if(product.category==='Sudaderas')return 'Sudadera'
  if(product.category==='Perfumes')return 'Perfume'
  return 'Producto'
}

export function displayProductSubtitle(product:Product){
  if(!isDefaultProvisionalName(product)&&product.subtitle)return product.subtitle
  const style=productStyle(product)
  if(product.category==='Jeans')return [style,product.fit&&style!==product.fit?product.fit:null].filter(Boolean).join(' · ')||'Estilo por confirmar'
  if(product.category==='Streetwear')return ['Gráfica',product.fit].filter(Boolean).join(' · ')
  if(product.category==='Conjuntos')return ['Conjunto',product.fit].filter(Boolean).join(' · ')
  if(product.category==='Perfumes')return 'Composición por confirmar'
  return product.subtitle||displayCategory(product.category)
}

export function displayProductDescription(product:Product){
  if(!isDefaultProvisionalName(product)&&product.description)return product.description
  const style=productStyle(product)
  if(product.category==='Jeans')return `Pantalón denim${style?' con acabado '+style.toLowerCase():''}${product.fit?' y corte '+product.fit:''}.`
  if(product.category==='Streetwear')return `Camiseta gráfica${product.fit?' de fit '+product.fit:''}.`
  if(product.category==='Conjuntos')return `Conjunto${product.color?' '+product.color.toLowerCase():''}${product.fit?' de fit '+product.fit:''}.`
  if(product.category==='Perfumes')return 'Perfume de la selección actual. Composición, notas y perfil olfativo por confirmar.'
  return product.description||'Información del producto por confirmar.'
}

export function displayProductFeatures(product:Product){
  const oldSeedCopy=product.features.some(f=>/Streetwear premium|Denim de estructura sólida|Corte Flared Fit con pierna acampanada/i.test(f))
  if(!isDefaultProvisionalName(product)&&!oldSeedCopy)return product.features
  const style=productStyle(product)
  if(product.category==='Jeans')return [product.fit?'Corte '+product.fit+'.':null,style?'Estilo / acabado: '+style+'.':null].filter(Boolean) as string[]
  if(product.category==='Streetwear')return [product.fit?'Fit '+product.fit+'.':null,'Camiseta gráfica.'].filter(Boolean) as string[]
  if(product.category==='Conjuntos')return [product.fit?'Fit '+product.fit+'.':null,product.color?'Color '+product.color+'.':null].filter(Boolean) as string[]
  return product.features
}

export function normalizeLegacyProduct(product:Product):Product{
  if(!isDefaultProvisionalName(product))return product
  return {...product,name:displayProductName(product),subtitle:displayProductSubtitle(product),description:displayProductDescription(product)}
}

export function clientHomeHeadline(value:string){
  const normalized=(value||'').replace(/\r/g,'').trim()
  if(!normalized||/DROP\s*\/\s*001[\s\S]*DENIM\s*\+\s*STREETWEAR/i.test(normalized))return 'TODO EL DROP\nPOR CATEGORÍAS'
  return value
}

export function clientHomeSubheadline(value:string,categoryLabels:string[]=[]){
  const defaultCopy=/^(Jeans, prendas streetwear y fragancias del drop actual\.?|Pantalones, camisetas, conjuntos y perfumes\. Entra a la categoría que buscas y encuentra rápido lo que necesitas\.)$/i
  if(!value||defaultCopy.test(value)){
    const list=categoryListText(categoryLabels.length?categoryLabels:['Pantalones','Camisetas','Conjuntos','Perfumes'])
    return list+'. Entra a la categoría que buscas y encuentra rápido lo que necesitas.'
  }
  return value
}

export function parseCommercialTerms(value:string|null|undefined):CommercialTerms{
  if(value?.startsWith(TERMS_PREFIX)){
    try{return {...DEFAULT_COMMERCIAL_TERMS,...JSON.parse(value.slice(TERMS_PREFIX.length))}}catch{}
  }
  return {...DEFAULT_COMMERCIAL_TERMS}
}

export function serializeCommercialTerms(terms:CommercialTerms){
  return TERMS_PREFIX+JSON.stringify(terms)
}

export function isLegacyShippingCopy(value:string|null|undefined){
  return !value||value.trim()===LEGACY_SHIPPING
}

export function formatCop(value:number){
  return '$'+Math.round(value).toLocaleString('es-CO')
}
