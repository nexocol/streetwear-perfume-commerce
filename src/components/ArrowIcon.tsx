/** Decorative navigation icons share the storefront's existing thin SVG stroke. */
export function ArrowIcon({direction='up-right'}:{direction?:'up-right'|'right'|'left'}){
  const path=direction==='right'?'M4 12h16m-6-6 6 6-6 6':direction==='left'?'M20 12H4m6-6-6 6 6 6':'M6 18 18 6M6 6h12v12'
  return <svg className="direction-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={path}/></svg>
}
