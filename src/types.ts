export type ProductStatus = 'draft' | 'active' | 'hidden' | 'archived'
export type MediaType = 'hero' | 'front' | 'back' | 'detail' | 'model' | 'editorial' | 'thumbnail'

export interface Variant {id:string;productId:string;size:string;color:string|null;sku:string|null;price:number|null;stock:number|null;available:boolean;shopifyVariantId:string|null;sortOrder:number}
export interface ProductMedia {id:string;productId:string;mediaType:MediaType;storagePath:string|null;publicUrl:string;alt:string|null;sortOrder:number}
export interface Collection {id:string;slug:string;name:string;enabled:boolean;sortOrder:number}
export interface Category {id:string;slug:string;name:string;enabled:boolean;sortOrder:number}
export interface Fit {id:string;slug:string;name:string;enabled:boolean;sortOrder:number}

export interface Product {
  id:string;slug:string;name:string;nameStatus:string;subtitle:string|null;description:string|null;categoryId:string|null;category:string;fit:string|null;color:string|null;
  price:number|null;compareAtPrice:number|null;featured:boolean;bestSeller:boolean;newArrival:boolean;status:ProductStatus;sortOrder:number;shopifyProductId:string|null;shopifyHandle:string|null;
  features:string[];variants:Variant[];media:ProductMedia[];collections:Collection[]
}
export interface HomepageSettings {id:string;heroProductId:string|null;heroSecondaryProductId:string|null;heroHeadline:string;heroSubheadline:string;featuredProductIds:string[];fragrancePrimaryId:string|null;fragranceSecondaryId:string|null;editorialProductId:string|null;editorialImageUrl:string|null}
export interface SiteSettings {id:string;brandName:string|null;logoUrl:string|null;instagram:string|null;whatsapp:string|null;email:string|null;shippingCopy:string|null;changesCopy:string|null;advisoryCopy:string|null;storeStatus:string;shopifyEnabled:boolean;previewNoindex:boolean}
export interface CatalogSnapshot {products:Product[];categories:Category[];collections:Collection[];fits:Fit[];homepage:HomepageSettings;site:SiteSettings}
export interface CartLine {key:string;productId:string;variantId:string;quantity:number}
export interface HydratedCartLine extends CartLine {product:Product;variant:Variant}
