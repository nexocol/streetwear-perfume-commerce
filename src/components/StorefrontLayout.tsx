import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { useUI } from '../context/UIContext'
import { Header } from './Header'
import { Footer } from './Footer'
import { CartDrawer } from './CartDrawer'
import { SearchOverlay } from './SearchOverlay'
import { Dialogs } from './Dialogs'
import { Cursor } from './Cursor'
import { MotionController } from './MotionController'
import { SeoGuard } from './SeoGuard'
import { LoadingState, ErrorState } from './LoadingState'

export function StorefrontLayout(){
  const catalog=useCatalog();const ui=useUI();const location=useLocation()
  useEffect(()=>{ui.closeAll();if(location.hash)requestAnimationFrame(()=>document.querySelector(location.hash)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}));else scrollTo({top:0,behavior:'auto'})},[location.pathname,location.hash])
  if(catalog.loading)return <LoadingState/>
  if(catalog.error||!catalog.catalog)return <ErrorState message={catalog.error||'Sin datos.'} onRetry={catalog.refresh}/>
  return <><SeoGuard/><Header/><Outlet/><Footer/><CartDrawer/><SearchOverlay/><Dialogs/><Cursor/><MotionController/>{ui.toast&&<div id="toast" className="visible" role="status">{ui.toast}</div>}</>
}
