export function money(value:number|null|undefined,context:'card'|'detail'='card'){
  if(value==null||!Number.isFinite(value))return context==='detail'?'PRECIO POR CONFIRMAR':'—'
  return new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value)
}
export const pad=(n:number)=>String(n).padStart(2,'0')
