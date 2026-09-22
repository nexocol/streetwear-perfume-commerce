import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/catalogRepository'

export function AdminLoginPage(){
  const auth=useAuth();const navigate=useNavigate();const location=useLocation();const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState<string|null>(null);const [busy,setBusy]=useState(false)
  if(auth.user&&auth.isAdmin)return <Navigate to="/admin/products" replace/>
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError(null);try{await auth.signIn(email,password);navigate((location.state as any)?.from||'/admin/products',{replace:true})}catch(err){setError(err instanceof Error?err.message:'No fue posible iniciar sesión.')}finally{setBusy(false)}}
  return <main className="admin-login"><section><span>STORE / 001</span><h1>ADMIN.</h1><p>Acceso privado al CMS.</p>{!isSupabaseConfigured&&<div className="admin-warning">Falta configurar Supabase en el entorno.</div>}<form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>{error&&<p className="form-error">{error}</p>}<button className="btn dark wide" disabled={busy||!isSupabaseConfigured}>{busy?'ENTRANDO…':'ENTRAR'}</button></form></section></main>
}
