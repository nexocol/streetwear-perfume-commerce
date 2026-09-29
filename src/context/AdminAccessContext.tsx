import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { adminLogout, getAdminSession } from '../lib/catalogRepository'
import { ADMIN_BASE, useAdminMode, type AdminMode } from '../admin/adminMode'

type State={loading:boolean;allowed:boolean;email:string|null;mode:AdminMode;mustChangePassword:boolean;refresh:()=>Promise<void>;signOut:()=>void}
const Context=createContext<State|null>(null)
export function AdminAccessProvider({children}:{children:React.ReactNode}){
  const mode=useAdminMode()
  const [loading,setLoading]=useState(true);const [allowed,setAllowed]=useState(false);const [email,setEmail]=useState<string|null>(null);const [mustChangePassword,setMustChange]=useState(false)
  async function refresh(){setLoading(true);try{const session=await getAdminSession();setAllowed(true);setEmail(session.email);setMustChange(Boolean(session.mustChangePassword))}catch{setAllowed(false);setEmail(null);setMustChange(false)}finally{setLoading(false)}}
  useEffect(()=>{void refresh()},[])
  const value=useMemo(()=>({loading,allowed,email,mode,mustChangePassword,refresh,signOut:()=>{
    if(mode==='access'){location.assign('/cdn-cgi/access/logout');return}
    void adminLogout().catch(()=>{}).finally(()=>location.assign(ADMIN_BASE[mode]))
  }}),[loading,allowed,email,mode,mustChangePassword])
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useAdminAccess(){const ctx=useContext(Context);if(!ctx)throw new Error('useAdminAccess must be inside AdminAccessProvider');return ctx}
