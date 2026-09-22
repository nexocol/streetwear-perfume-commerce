import { useState } from 'react'
type Props=React.ImgHTMLAttributes<HTMLImageElement>&{fallbackLabel?:string}
export function ImageWithFallback({fallbackLabel='Imagen no disponible',alt='',...props}:Props){
  const [failed,setFailed]=useState(false)
  if(failed)return <div className="image-fallback" role="img" aria-label={alt||fallbackLabel}><span>{fallbackLabel}</span></div>
  return <img {...props} alt={alt} onError={()=>setFailed(true)}/>
}
