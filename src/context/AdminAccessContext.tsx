import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getAdminSession } from '../lib/catalogRepository'

type State={loading:boolean;allowed:boolean;email:string|null;refresh:()=>Promise<void>;signOut:()=>void}
const Context=createContext<State|null>(null)
export function AdminAccessProvider({children}:{children:React.ReactNode}){
  const [loading,setLoading]=useState(true);const [allowed,setAllowed]=useState(false);const [email,setEmail]=useState<string|null>(null)
  async function refresh(){setLoading(true);try{const session=await getAdminSession();setAllowed(true);setEmail(session.email)}catch{setAllowed(false);setEmail(null)}finally{setLoading(false)}}
  useEffect(()=>{void refresh()},[])
  const value=useMemo(()=>({loading,allowed,email,refresh,signOut:()=>location.assign('/cdn-cgi/access/logout')}),[loading,allowed,email])
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useAdminAccess(){const ctx=useContext(Context);if(!ctx)throw new Error('useAdminAccess must be inside AdminAccessProvider');return ctx}
