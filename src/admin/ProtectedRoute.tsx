import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export function ProtectedRoute(){
  const auth=useAuth();const location=useLocation()
  if(auth.loading)return <main className="admin-login"><p>Verificando sesión…</p></main>
  if(!auth.user||!auth.isAdmin)return <Navigate to="/admin/login" replace state={{from:location.pathname}}/>
  return <Outlet/>
}
