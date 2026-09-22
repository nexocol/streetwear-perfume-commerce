import { createContext, useContext } from 'react'
import type { CommerceAdapter } from './types'
import { usePreviewCommerce } from './PreviewCommerceProvider'

const CommerceContext=createContext<CommerceAdapter|null>(null)
export function CommerceProvider({children}:{children:React.ReactNode}){
  const adapter=usePreviewCommerce()
  if((import.meta.env.VITE_COMMERCE_PROVIDER||'preview')==='shopify')console.warn('Shopify adapter selected but credentials/integration are not active yet; preview cart remains enabled.')
  return <CommerceContext.Provider value={adapter}>{children}</CommerceContext.Provider>
}
export function useCommerce(){const ctx=useContext(CommerceContext);if(!ctx)throw new Error('useCommerce must be used inside CommerceProvider');return ctx}
