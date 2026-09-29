import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAccess } from '../context/AdminAccessContext'
import { changeAdminPassword } from '../lib/catalogRepository'
import { PanelBrand } from './PanelLogin'

export function ChangePasswordPage(){
  const access=useAdminAccess();const navigate=useNavigate()
  const [next,setNext]=useState('');const [confirm,setConfirm]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false)
  async function submit(event:React.FormEvent){
    event.preventDefault();if(busy)return
    if(next.length<8){setError('La contraseña debe tener al menos 8 caracteres.');return}
    if(next!==confirm){setError('Las contraseñas no coinciden.');return}
    setBusy(true);setError('')
    try{await changeAdminPassword(next,confirm);await access.refresh();navigate('/panel/products',{replace:true})}
    catch(err){setError(err instanceof Error?err.message:'No fue posible guardar la contraseña.')}
    finally{setBusy(false)}
  }
  return <main className="panel-screen"><section className="panel-card">
    <PanelBrand/>
    <h1>Crea tu nueva contraseña</h1>
    <p className="panel-lead">Por seguridad, reemplaza la contraseña temporal antes de continuar.</p>
    <form onSubmit={submit} noValidate>
      <label>Nueva contraseña<input name="new-password" type="password" autoComplete="new-password" autoFocus value={next} onChange={e=>setNext(e.target.value)}/></label>
      <label>Confirmar contraseña<input name="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
      <small className="panel-hint">Mínimo 8 caracteres.</small>
      {error&&<p className="panel-error" role="alert">{error}</p>}
      <button className="btn dark wide" type="submit" disabled={busy}>{busy?'GUARDANDO…':'GUARDAR CONTRASEÑA'}</button>
    </form>
    <small>Administración de tienda</small>
  </section></main>
}
