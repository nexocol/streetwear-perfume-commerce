import { useLocation } from 'react-router-dom'

// One admin UI, three entrances: /admin (Cloudflare Access, Nexo), /panel (client login), /demo/panel (read-only demo).
export type AdminMode='access'|'panel'|'demo'
export const ADMIN_BASE:Record<AdminMode,string>={access:'/admin',panel:'/panel',demo:'/demo/panel'}
export const ADMIN_API:Record<AdminMode,string>={access:'/api/admin',panel:'/api/panel',demo:'/api/demo'}

export function adminModeFromPath(pathname:string):AdminMode{
  if(pathname==='/demo/panel'||pathname.startsWith('/demo/panel/'))return 'demo'
  if(pathname==='/panel'||pathname.startsWith('/panel/'))return 'panel'
  return 'access'
}
export function adminApiBase(){return ADMIN_API[adminModeFromPath(location.pathname)]}
export function useAdminMode(){return adminModeFromPath(useLocation().pathname)}
export function useAdminBase(){return ADMIN_BASE[useAdminMode()]}
