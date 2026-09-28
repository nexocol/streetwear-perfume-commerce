import { createContext, useContext } from 'react'
import type { CommerceAdapter } from './types'
import { usePreviewCommerce } from './PreviewCommerceProvider'
import { useShopifyCommerce } from './ShopifyCommerceProvider'
import { useCatalog } from '../context/CatalogContext'

const CommerceContext=createContext<CommerceAdapter|null>(null)
export function CommerceProvider({children}:{children:React.ReactNode}){
  const {catalog}=useCatalog()
  // site_settings.shopify_enabled (D1, admin-editable) is the source of truth for which
  // adapter is live — not a build-time env var. Both hooks run unconditionally (rules of
  // hooks); only the active one's actions are ever invoked.
  const preview=usePreviewCommerce()
  const shopify=useShopifyCommerce()
  const adapter=catalog?.site?.shopifyEnabled?shopify:preview
  return <CommerceContext.Provider value={adapter}>{children}</CommerceContext.Provider>
}
export function useCommerce(){const ctx=useContext(CommerceContext);if(!ctx)throw new Error('useCommerce must be used inside CommerceProvider');return ctx}
