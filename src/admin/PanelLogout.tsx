import { useEffect } from 'react'
import { adminLogout } from '../lib/catalogRepository'

// /panel/logout: end the session on the server, then return to the login screen.
export function PanelLogout(){
  useEffect(()=>{void adminLogout().catch(()=>{}).finally(()=>location.replace('/panel'))},[])
  return <main className="admin-login"><p>Cerrando sesión…</p></main>
}
