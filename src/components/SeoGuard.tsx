import { useEffect } from 'react'
import { useCatalog } from '../context/CatalogContext'
export function SeoGuard(){
  const {catalog}=useCatalog()
  useEffect(()=>{
    const preview=(import.meta.env.VITE_PREVIEW_NOINDEX??'true')!=='false'||Boolean(catalog?.site.previewNoindex)
    const value=preview?'noindex,nofollow,noarchive,nosnippet':'index,follow'
    for(const id of ['robots-meta','googlebot-meta'])document.getElementById(id)?.setAttribute('content',value)
  },[catalog?.site.previewNoindex])
  return null
}
