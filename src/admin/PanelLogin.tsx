import { useState } from 'react'
import { useAdminAccess } from '../context/AdminAccessContext'
import { useCatalog } from '../context/CatalogContext'
import { adminLogin } from '../lib/catalogRepository'
import type { AdminMode } from './adminMode'

export function PanelBrand({demo=false}:{demo?:boolean}){
  const {catalog}=useCatalog();const logo=demo?null:catalog?.site.logoUrl
  return <div className="panel-brand">{logo?<img src={logo} alt="EL PUNTO"/>:<strong>EL PUNTO</strong>}{demo&&<span className="demo-pill">MODO DEMO</span>}</div>
}

export function PanelLogin({mode}:{mode:Exclude<AdminMode,'access'>}){
  const access=useAdminAccess()
  const [username,setUsername]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false)
  async function submit(event:React.FormEvent){
    event.preventDefault();if(busy)return
    setBusy(true);setError('')
    try{await adminLogin(username,password);await access.refresh()}
    catch(err){setError(err instanceof Error?err.message:'No fue posible ingresar.')}
    finally{setBusy(false)}
  }
  return <main className="panel-screen"><section className="panel-card">
    <PanelBrand demo={mode==='demo'}/>
    <h1>Panel administrativo</h1>
    <form onSubmit={submit} noValidate>
      <label>Usuario<input name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus value={username} onChange={e=>setUsername(e.target.value)}/></label>
      <label>Contraseña<input name="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {error&&<p className="panel-error" role="alert">{error}</p>}
      <button className="btn dark wide" type="submit" disabled={busy}>{busy?'INGRESANDO…':'INGRESAR'}</button>
    </form>
    <small>Administración de tienda</small>
  </section></main>
}
