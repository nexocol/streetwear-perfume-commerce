import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchCatalog } from '../lib/catalogRepository'
import type { CatalogSnapshot, Product } from '../types'

type State={catalog:CatalogSnapshot|null;loading:boolean;error:string|null;refresh:()=>Promise<void>;productById:(id:string|null|undefined)=>Product|undefined;productBySlug:(slug:string)=>Product|undefined}
const CatalogContext=createContext<State|null>(null)

export function CatalogProvider({children}:{children:React.ReactNode}){
  const [catalog,setCatalog]=useState<CatalogSnapshot|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const refresh=useCallback(async()=>{
    setLoading(true);setError(null)
    try{setCatalog(await fetchCatalog(false))}catch(e){setError(e instanceof Error?e.message:'No fue posible cargar el catálogo.')}finally{setLoading(false)}
  },[])
  useEffect(()=>{void refresh()},[refresh])
  const value=useMemo<State>(()=>({
    catalog,loading,error,refresh,
    productById:(id)=>catalog?.products.find(p=>p.id===id),
    productBySlug:(slug)=>catalog?.products.find(p=>p.slug===slug)
  }),[catalog,loading,error,refresh])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}
export function useCatalog(){const ctx=useContext(CatalogContext);if(!ctx)throw new Error('useCatalog must be used inside CatalogProvider');return ctx}
