import { NavLink, Outlet } from 'react-router-dom'
import { useAdminAccess } from '../context/AdminAccessContext'
export function AdminLayout(){
  const access=useAdminAccess()
  return <main className="admin-shell"><aside className="admin-nav"><div><b>CMS</b><small>STORE / 001</small></div><nav><NavLink to="/admin/products">PRODUCTOS</NavLink><NavLink to="/admin/home">HOME</NavLink><NavLink to="/admin/settings">AJUSTES</NavLink></nav><div className="admin-user"><span>{access.email||'Cloudflare Access'}</span><button onClick={access.signOut}>SALIR</button></div></aside><section className="admin-workspace"><Outlet/></section></main>
}
