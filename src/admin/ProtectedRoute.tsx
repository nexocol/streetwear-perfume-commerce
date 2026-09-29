import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAccess } from '../context/AdminAccessContext'
import { PanelLogin } from './PanelLogin'

const CHANGE_PASSWORD_PATH='/panel/cambiar-clave'

// /panel and /demo/panel are private: keep them out of search results even if a crawler ever reaches the shell, and title the tab as an admin.
function usePrivateShell(mode:'access'|'panel'|'demo'){
  useEffect(()=>{
    if(mode==='access')return
    const title=document.title;document.title=(mode==='demo'?'MODO DEMO · ':'')+'Panel administrativo · EL PUNTO'
    const metas=[...document.querySelectorAll<HTMLMetaElement>('meta[name="robots"],meta[name="googlebot"]')]
    const previous=metas.map(m=>m.content)
    metas.forEach(m=>{m.content='noindex,nofollow,noarchive'})
    return()=>{document.title=title;metas.forEach((m,i)=>{m.content=previous[i]})}
  },[mode])
}

export function ProtectedRoute(){
  const access=useAdminAccess();const {pathname}=useLocation()
  usePrivateShell(access.mode)
  if(access.loading)return <main className="admin-login"><p>Verificando acceso…</p></main>
  if(!access.allowed){
    if(access.mode!=='access')return <PanelLogin mode={access.mode}/>
    return <main className="admin-login"><section><span>EL PUNTO</span><h1>ADMIN.</h1><p>Esta zona requiere autenticación con Cloudflare Access.</p><div className="admin-warning">El acceso al CMS aún no está habilitado para esta sesión.</div><button className="btn dark wide" onClick={()=>location.reload()}>REINTENTAR</button></section></main>
  }
  if(access.mode==='panel'){
    if(access.mustChangePassword&&pathname!==CHANGE_PASSWORD_PATH)return <Navigate to={CHANGE_PASSWORD_PATH} replace/>
    if(!access.mustChangePassword&&pathname===CHANGE_PASSWORD_PATH)return <Navigate to="/panel/products" replace/>
  }
  return <Outlet/>
}
