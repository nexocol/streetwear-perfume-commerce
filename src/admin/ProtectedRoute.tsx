import { Outlet } from 'react-router-dom'
import { useAdminAccess } from '../context/AdminAccessContext'
export function ProtectedRoute(){
  const access=useAdminAccess()
  if(access.loading)return <main className="admin-login"><p>Verificando acceso…</p></main>
  if(!access.allowed)return <main className="admin-login"><section><span>STORE / 001</span><h1>ADMIN.</h1><p>Esta zona requiere autenticación con Cloudflare Access.</p><div className="admin-warning">El acceso al CMS aún no está habilitado para esta sesión.</div><button className="btn dark wide" onClick={()=>location.reload()}>REINTENTAR</button></section></main>
  return <Outlet/>
}
