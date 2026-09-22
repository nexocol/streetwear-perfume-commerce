import type { CatalogSnapshot, Product, HomepageSettings, SiteSettings, Category, Collection, Fit } from '../types'

const driveImage=(id:string,width=1600)=>`https://lh3.googleusercontent.com/d/${id}=w${width}`
const ids={
  tee1:'1ev3sMqVwP681ERFoHIpbXRSo6CRG7Lpc',
  teeBack:'1odcYeVgo-dTFamzSyLZoX0FbnsCJBuiR',
  setBlack:'1W73W8kxkeOnYYtx08XVEzA4kSQHHSbiI',
  denimDistressed:'1ONkU3pMbdhFziTHc4NE0mWXmV7dPRNOy',
  denimGrey:'1VcVp_UIGeR7h-R2E4R7v0FFeRACr1dfy',
  perfume1:'1_YiU7Bu_rHnrJ96HkdXhblauYbRzi9oA',
  perfume2:'1Ajd0-B_hF0YT2MR8dxUuFFsYqgTtCPuy'
}

const categories:Category[]=[
  {id:'cat-jeans',slug:'jeans',name:'Jeans',enabled:true,sortOrder:1},
  {id:'cat-streetwear',slug:'streetwear',name:'Streetwear',enabled:true,sortOrder:2},
  {id:'cat-sets',slug:'conjuntos',name:'Conjuntos',enabled:true,sortOrder:3},
  {id:'cat-perfume',slug:'perfumes',name:'Perfumes',enabled:true,sortOrder:4},
]
const collections:Collection[]=[
  {id:'col-drop',slug:'drop-001',name:'Drop 001',enabled:true,sortOrder:1},
  {id:'col-denim',slug:'denim',name:'Denim',enabled:true,sortOrder:2},
  {id:'col-graphic',slug:'graphic',name:'Graphic',enabled:true,sortOrder:3},
  {id:'col-fragrance',slug:'fragrance-edit',name:'Fragrance Edit',enabled:true,sortOrder:4},
]
const fits:Fit[]=[
  {id:'fit-flared',slug:'flared-fit',name:'Flared Fit',enabled:true,sortOrder:1},
  {id:'fit-oversized',slug:'oversized',name:'Oversized',enabled:true,sortOrder:2},
  {id:'fit-regular',slug:'regular',name:'Regular',enabled:true,sortOrder:3},
]

const denimFeatures=[
  'Corte Flared Fit con pierna acampanada que aporta una silueta amplia y definida.',
  'Denim de estructura sólida, con un calce amplio y una caída cuidadosamente definida.',
  'Tratamiento de lavado acompañado de detalles estéticos que resaltan el carácter de la prenda.',
  'Streetwear premium con estética moderna y gran presencia visual.'
]

function variants(productId:string,sizes:string[]){
  return sizes.map((size,i)=>({id:`${productId}-${size}`,productId,size,color:null,sku:null,price:null,stock:null,available:true,shopifyVariantId:null,sortOrder:i+1}))
}
function media(productId:string,url:string,alt:string){
  return [{id:`${productId}-hero`,productId,mediaType:'hero' as const,storagePath:null,publicUrl:url,alt,sortOrder:1}]
}
const drop=collections[0]
export const seedProducts:Product[]=[
  {id:'denim-01',slug:'ref-temporal-denim-01',name:'DENIM / 001',nameStatus:'provisional',subtitle:'Flared Fit · Denim',description:'Denim de estructura sólida con silueta amplia y caída definida.',categoryId:'cat-jeans',category:'Jeans',fit:'Flared Fit',color:'Blue',price:null,compareAtPrice:null,featured:true,bestSeller:true,newArrival:true,status:'active',sortOrder:1,shopifyProductId:null,shopifyHandle:null,features:denimFeatures,variants:variants('denim-01',['30','32','34','36','38']),media:media('denim-01',driveImage(ids.denimDistressed),'Jean denim distressed real del cliente'),collections:[drop,collections[1]]},
  {id:'denim-02',slug:'ref-temporal-denim-02',name:'DENIM / 002',nameStatus:'provisional',subtitle:'Flared Fit · Grey Denim',description:'Denim gris con silueta amplia y acabado lavado.',categoryId:'cat-jeans',category:'Jeans',fit:'Flared Fit',color:'Grey',price:null,compareAtPrice:null,featured:true,bestSeller:false,newArrival:true,status:'active',sortOrder:2,shopifyProductId:null,shopifyHandle:null,features:denimFeatures,variants:variants('denim-02',['30','32','34','36','38']),media:media('denim-02',driveImage(ids.denimGrey),'Jean gris flared real del cliente'),collections:[drop,collections[1]]},
  {id:'tee-01',slug:'ref-temporal-tee-01',name:'TEE / 001',nameStatus:'provisional',subtitle:'Oversized · Graphic',description:'Camiseta gráfica de silueta amplia para looks streetwear.',categoryId:'cat-streetwear',category:'Streetwear',fit:'Oversized',color:'Multi',price:null,compareAtPrice:null,featured:true,bestSeller:true,newArrival:false,status:'active',sortOrder:3,shopifyProductId:null,shopifyHandle:null,features:[],variants:variants('tee-01',['S','M','L','XL']),media:media('tee-01',driveImage(ids.tee1),'Camisetas gráficas reales del cliente'),collections:[drop,collections[2]]},
  {id:'set-01',slug:'ref-temporal-set-01',name:'SET / 001',nameStatus:'provisional',subtitle:'Regular Fit · Black Set',description:'Conjunto negro de la selección actual.',categoryId:'cat-sets',category:'Conjuntos',fit:'Regular',color:'Black',price:null,compareAtPrice:null,featured:true,bestSeller:false,newArrival:true,status:'active',sortOrder:4,shopifyProductId:null,shopifyHandle:null,features:[],variants:variants('set-01',['S','M','L','XL']),media:media('set-01',driveImage(ids.setBlack),'Conjunto negro real del cliente'),collections:[drop]},
  {id:'perfume-01',slug:'ref-temporal-perfume-01',name:'FRAGRANCE / 001',nameStatus:'provisional',subtitle:'Fragrance Edit · Drop 001',description:'Fragancia de la selección actual.',categoryId:'cat-perfume',category:'Perfumes',fit:null,color:'Pink',price:null,compareAtPrice:null,featured:true,bestSeller:true,newArrival:true,status:'active',sortOrder:5,shopifyProductId:null,shopifyHandle:null,features:[],variants:variants('perfume-01',['Única']),media:media('perfume-01',driveImage(ids.perfume1),'Perfume real del cliente en composición floral'),collections:[drop,collections[3]]},
  {id:'perfume-02',slug:'ref-temporal-perfume-02',name:'FRAGRANCE / 002',nameStatus:'provisional',subtitle:'Fragrance Edit · Drop 001',description:'Fragancia de la selección actual.',categoryId:'cat-perfume',category:'Perfumes',fit:null,color:'Pink',price:null,compareAtPrice:null,featured:false,bestSeller:true,newArrival:false,status:'active',sortOrder:6,shopifyProductId:null,shopifyHandle:null,features:[],variants:variants('perfume-02',['Única']),media:media('perfume-02',driveImage(ids.perfume2),'Perfume real del cliente sobre flores'),collections:[drop,collections[3]]},
]
export const seedHomepage:HomepageSettings={id:'default',heroProductId:'denim-02',heroSecondaryProductId:'denim-01',heroHeadline:'DROP / 001\nDENIM + STREETWEAR',heroSubheadline:'Jeans, prendas streetwear y fragancias del drop actual.',featuredProductIds:['denim-01','tee-01','denim-02','set-01'],fragrancePrimaryId:'perfume-01',fragranceSecondaryId:'perfume-02',editorialProductId:'tee-01',editorialImageUrl:driveImage(ids.teeBack)}
export const seedSite:SiteSettings={id:'default',brandName:null,logoUrl:null,instagram:null,whatsapp:null,email:null,shippingCopy:'La cobertura, el costo y los tiempos de envío se confirmarán según el destino.',changesCopy:'La prenda debe regresar sin uso, manchas, daños, modificaciones u olores, con etiquetas y elementos originales.',advisoryCopy:'Si estás entre dos tallas, compara las medidas con una prenda propia cuyo fit te guste antes de elegir.',storeStatus:'preview',shopifyEnabled:false,previewNoindex:true}
export const seedCatalog:CatalogSnapshot={products:seedProducts,categories,collections,fits,homepage:seedHomepage,site:seedSite}
