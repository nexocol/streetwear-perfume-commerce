import { useEffect, useState } from 'react'

export const BRAND_FALLBACK_NAME='EL PUNTO'

export function BrandMark({name,logo,className=''}:{name:string;logo?:string|null;className?:string}){
  const [failed,setFailed]=useState(false)
  useEffect(()=>setFailed(false),[logo])
  if(logo&&!failed)return <img className={'brand-logo '+className} src={logo} alt={name} decoding="async" onError={()=>setFailed(true)}/>
  return <strong className={'brand-text '+className}>{name}</strong>
}
