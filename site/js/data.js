export const brand = {
  name: '',
  placeholder: '[ BRAND ]',
  season: 'STORE / 001',
  currency: 'COP'
};

export const driveImage = (id, width=1600) => `https://lh3.googleusercontent.com/d/${id}=w${width}`;

const ids = {
  tee1:'1ev3sMqVwP681ERFoHIpbXRSo6CRG7Lpc',
  tee2:'1grGMu9MdUNwpVgcOVJ4Dj-8-ORX7tlhY',
  denimPattern:'1KrqGkobiVUz0haNyO29J_WVw2HAegqlW',
  denimDistressed:'1ONkU3pMbdhFziTHc4NE0mWXmV7dPRNOy',
  denimGrey:'1VcVp_UIGeR7h-R2E4R7v0FFeRACr1dfy',
  tee3:'1lJ5kJhQbVXV6qu9xT25UwNVtSD4axjRg',
  teeBack:'1odcYeVgo-dTFamzSyLZoX0FbnsCJBuiR',
  setBlack:'1W73W8kxkeOnYYtx08XVEzA4kSQHHSbiI',
  perfume1:'1_YiU7Bu_rHnrJ96HkdXhblauYbRzi9oA',
  perfume2:'1Ajd0-B_hF0YT2MR8dxUuFFsYqgTtCPuy'
};

export const sizeGuide = {
  title:'Encuentra tu talla ideal',
  headers:['Talla','Cintura','Cadera','Tiro','Largo'],
  rows:[
    ['30','80 cm','100 cm','29 cm','105 cm'],
    ['32','82 cm','102 cm','31 cm','107 cm'],
    ['34','84 cm','104 cm','33 cm','109 cm'],
    ['36','86 cm','106 cm','35 cm','111 cm'],
    ['38','88 cm','108 cm','37 cm','113 cm']
  ],
  note:'Medidas aproximadas tomadas con la prenda extendida. Puede existir una variación de ±1–2 cm.'
};

const denimFeatures=[
  'Corte Flared Fit con pierna acampanada que aporta una silueta amplia y definida.',
  'Denim de estructura sólida, con un calce amplio y una caída cuidadosamente definida.',
  'Tratamiento de lavado acompañado de detalles estéticos que resaltan el carácter de la prenda.',
  'Streetwear premium con estética moderna y gran presencia visual.'
];

const variantSizes = sizes => sizes.map(size=>({
  id:'variant-'+size, size, color:null, sku:null, price:null, stock:null,
  available:true, shopifyVariantId:null
}));

export const products=[
  {
    id:'denim-01',slug:'ref-temporal-denim-01',name:'DENIM / 001',nameStatus:'provisional',sortOrder:1,
    subtitle:'Flared Fit · Denim',category:'Jeans',collections:['Denim','Drop 001'],
    fit:'Flared Fit',color:'Blue',price:null,compareAtPrice:null,featured:true,bestSeller:true,newArrival:true,
    description:'Denim de estructura sólida con silueta amplia y caída definida.',
    features:denimFeatures,
    media:[
      {type:'hero',src:driveImage(ids.denimDistressed),alt:'Jean denim distressed real del cliente'},
      {type:'detail',src:driveImage(ids.denimPattern),alt:'Detalle denim real del cliente'},
      {type:'editorial',src:driveImage(ids.denimGrey),alt:'Jean gris flared real del cliente'}
    ],
    variants:variantSizes(['30','32','34','36','38']),
    shopifyMapping:{productId:null,handle:null}
  },
  {
    id:'denim-02',slug:'ref-temporal-denim-02',name:'DENIM / 002',nameStatus:'provisional',sortOrder:2,
    subtitle:'Flared Fit · Grey Denim',category:'Jeans',collections:['Denim','Drop 001'],
    fit:'Flared Fit',color:'Grey',price:null,featured:true,bestSeller:false,newArrival:true,
    description:'Denim gris con silueta amplia y acabado lavado.',
    features:denimFeatures,
    media:[
      {type:'hero',src:driveImage(ids.denimGrey),alt:'Jean gris flared real del cliente'},
      {type:'detail',src:driveImage(ids.denimDistressed),alt:'Detalle denim real del cliente'}
    ],
    variants:variantSizes(['30','32','34','36','38']),
    shopifyMapping:{productId:null,handle:null}
  },
  {
    id:'tee-01',slug:'ref-temporal-tee-01',name:'TEE / 001',nameStatus:'provisional',sortOrder:3,
    subtitle:'Oversized · Graphic',category:'Streetwear',collections:['Graphic','Drop 001'],
    fit:'Oversized',color:'Multi',price:null,featured:true,bestSeller:true,newArrival:false,
    description:'Camiseta gráfica de silueta amplia para looks streetwear.',
    features:[],
    media:[
      {type:'hero',src:driveImage(ids.tee1),alt:'Camisetas gráficas reales del cliente'},
      {type:'back',src:driveImage(ids.teeBack),alt:'Vista posterior de camisetas reales del cliente'},
      {type:'editorial',src:driveImage(ids.tee3),alt:'Camisetas gráficas en exhibición'}
    ],
    variants:variantSizes(['S','M','L','XL']),
    shopifyMapping:{productId:null,handle:null}
  },
  {
    id:'set-01',slug:'ref-temporal-set-01',name:'SET / 001',nameStatus:'provisional',sortOrder:4,
    subtitle:'Regular Fit · Black Set',category:'Conjuntos',collections:['Technical','Drop 001'],
    fit:'Regular',color:'Black',price:null,featured:true,bestSeller:false,newArrival:true,
    description:'Conjunto negro de la selección actual.',
    features:[],
    media:[{type:'hero',src:driveImage(ids.setBlack),alt:'Conjunto negro real del cliente'}],
    variants:variantSizes(['S','M','L','XL']),
    shopifyMapping:{productId:null,handle:null}
  },
  {
    id:'perfume-01',slug:'ref-temporal-perfume-01',name:'FRAGRANCE / 001',nameStatus:'provisional',sortOrder:5,
    subtitle:'Fragrance Edit · Drop 001',category:'Perfumes',collections:['Fragrance Edit','Drop 001'],
    fit:null,color:'Pink',price:null,featured:true,bestSeller:true,newArrival:true,
    description:'Fragancia de la selección actual.',
    features:[],
    media:[{type:'hero',src:driveImage(ids.perfume1),alt:'Perfume real del cliente en composición floral'}],
    variants:variantSizes(['Única']),
    shopifyMapping:{productId:null,handle:null}
  },
  {
    id:'perfume-02',slug:'ref-temporal-perfume-02',name:'FRAGRANCE / 002',nameStatus:'provisional',sortOrder:6,
    subtitle:'Fragrance Edit · Drop 001',category:'Perfumes',collections:['Fragrance Edit','Drop 001'],
    fit:null,color:'Pink',price:null,featured:false,bestSeller:true,newArrival:false,
    description:'Fragancia de la selección actual.',
    features:[],
    media:[{type:'hero',src:driveImage(ids.perfume2),alt:'Perfume real del cliente sobre flores'}],
    variants:variantSizes(['Única']),
    shopifyMapping:{productId:null,handle:null}
  }
];

export const home={
  heroHeadline:'DROP / 001\nDENIM + STREETWEAR',
  heroSubheadline:'Jeans, prendas streetwear y fragancias del drop actual.',
  heroProductId:'denim-01',
  heroSecondaryProductId:'denim-02',
  featuredIds:['denim-01','tee-01','denim-02','set-01'],
  fragrancePrimaryId:'perfume-01',
  fragranceSecondaryId:'perfume-02',
  editorialProductId:'tee-01'
};
