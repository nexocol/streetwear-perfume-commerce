import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type InfoKind='size'|'changes'|'advice'|'shipping'|null
type UIState={
  menuOpen:boolean;cartOpen:boolean;searchOpen:boolean;info:InfoKind;toast:string|null;
  openMenu:()=>void;closeMenu:()=>void;openCart:()=>void;closeCart:()=>void;openSearch:()=>void;closeSearch:()=>void;
  openInfo:(kind:Exclude<InfoKind,null>)=>void;closeInfo:()=>void;showToast:(message:string)=>void;closeAll:()=>void
}
const UIContext=createContext<UIState|null>(null)

export function UIProvider({children}:{children:React.ReactNode}){
  const [menuOpen,setMenuOpen]=useState(false);const [cartOpen,setCartOpen]=useState(false);const [searchOpen,setSearchOpen]=useState(false);const [info,setInfo]=useState<InfoKind>(null);const [toast,setToast]=useState<string|null>(null)
  function closeAll(){setMenuOpen(false);setCartOpen(false);setSearchOpen(false);setInfo(null)}
  function showToast(message:string){setToast(message);window.setTimeout(()=>setToast(null),1500)}
  function openMenu(){setCartOpen(false);setSearchOpen(false);setMenuOpen(true)}
  function openCart(){setMenuOpen(false);setSearchOpen(false);setCartOpen(true)}
  function openSearch(){setMenuOpen(false);setCartOpen(false);setSearchOpen(true)}
  useEffect(()=>{
    document.body.classList.toggle('menu-open',menuOpen);document.body.classList.toggle('cart-open',cartOpen);document.body.classList.toggle('search-open',searchOpen)
    document.body.classList.toggle('is-locked',menuOpen||cartOpen||searchOpen||Boolean(info))
  },[menuOpen,cartOpen,searchOpen,info])
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')closeAll()};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey)},[])
  const value=useMemo<UIState>(()=>({menuOpen,cartOpen,searchOpen,info,toast,openMenu,closeMenu:()=>setMenuOpen(false),openCart,closeCart:()=>setCartOpen(false),openSearch,closeSearch:()=>setSearchOpen(false),openInfo:(kind)=>setInfo(kind),closeInfo:()=>setInfo(null),showToast,closeAll}),[menuOpen,cartOpen,searchOpen,info,toast])
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}
export function useUI(){const ctx=useContext(UIContext);if(!ctx)throw new Error('useUI must be inside UIProvider');return ctx}
