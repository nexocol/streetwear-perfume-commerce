import type { Product, Variant } from '../types'

export interface ShopifyCommercePort {
  createCart():Promise<{id:string;checkoutUrl:string}>
  addLine(cartId:string,product:Product,variant:Variant,quantity:number):Promise<void>
  updateLine(cartId:string,lineId:string,quantity:number):Promise<void>
  removeLine(cartId:string,lineId:string):Promise<void>
  checkoutUrl(cartId:string):Promise<string>
}
export class ShopifyProvider implements ShopifyCommercePort {
  constructor(private domain:string,private token:string){}
  private unavailable():never{throw new Error('Shopify todavía no está conectado. Configura Storefront API y mappings antes de activar este provider.')}
  async createCart(){return this.unavailable()}
  async addLine(_cartId:string,_product:Product,_variant:Variant,_quantity:number){this.unavailable()}
  async updateLine(_cartId:string,_lineId:string,_quantity:number){this.unavailable()}
  async removeLine(_cartId:string,_lineId:string){this.unavailable()}
  async checkoutUrl(_cartId:string){return this.unavailable()}
}
