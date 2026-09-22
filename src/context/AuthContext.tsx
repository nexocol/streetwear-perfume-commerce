import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isCurrentUserAdmin } from '../lib/catalogRepository'
import { supabase } from '../lib/supabase'

type AuthState={
  session:Session|null;user:User|null;loading:boolean;isAdmin:boolean;
  signIn:(email:string,password:string)=>Promise<void>;signOut:()=>Promise<void>
}
const AuthContext=createContext<AuthState|null>(null)

export function AuthProvider({children}:{children:React.ReactNode}){
  const [session,setSession]=useState<Session|null>(null)
  const [loading,setLoading]=useState(true)
  const [isAdmin,setIsAdmin]=useState(false)
  useEffect(()=>{
    if(!supabase){setLoading(false);return}
    let mounted=true
    supabase.auth.getSession().then(async({data})=>{
      if(!mounted)return
      setSession(data.session)
      setIsAdmin(data.session?await isCurrentUserAdmin():false)
      setLoading(false)
    })
    const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_event,next)=>{
      setSession(next);setIsAdmin(next?await isCurrentUserAdmin():false);setLoading(false)
    })
    return()=>{mounted=false;subscription.unsubscribe()}
  },[])
  async function signIn(email:string,password:string){
    if(!supabase)throw new Error('Supabase no está configurado.')
    const {error}=await supabase.auth.signInWithPassword({email,password})
    if(error)throw error
  }
  async function signOut(){if(supabase)await supabase.auth.signOut()}
  const value=useMemo(()=>({session,user:session?.user||null,loading,isAdmin,signIn,signOut}),[session,loading,isAdmin])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth(){const ctx=useContext(AuthContext);if(!ctx)throw new Error('useAuth must be used inside AuthProvider');return ctx}
