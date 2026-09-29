import { NavLink, Outlet } from 'react-router-dom'
import { useAdminAccess } from '../context/AdminAccessContext'
import { useAdminBase } from './adminMode'
export function AdminLayout(){
  const access=useAdminAccess();const base=useAdminBase();const demo=access.mode==='demo'
  return <main className={'admin-shell'+(demo?' is-demo':'')}>
    {demo&&<div className="demo-strip" role="status"><b>MODO DEMO</b><span>Datos de ejemplo · Los cambios no se guardan</span></div>}
    <aside className="admin-nav"><div><b>CMS</b><small>EL PUNTO</small></div><nav><NavLink to={base+'/products'}>PRODUCTOS</NavLink><NavLink to={base+'/home'}>HOME</NavLink><NavLink to={base+'/settings'}>AJUSTES</NavLink></nav><div className="admin-user"><span>{access.email||'Cloudflare Access'}</span><button onClick={access.signOut}>SALIR</button></div></aside>
    <section className="admin-workspace"><Outlet/></section>
  </main>
}
