import type { Category, Fit } from '../types'
type Filters={cat:string;size:string;fit:string;sort:string}
export function FilterPanel({open,filters,categories,sizes,fits,count,onChange,onClear,onClose}:{open:boolean;filters:Filters;categories:Category[];sizes:string[];fits:Fit[];count:number;onChange:(key:keyof Filters,value:string)=>void;onClear:()=>void;onClose:()=>void}){
  const option=(key:keyof Filters,value:string,label:string,active:boolean)=><button className={'filter-option '+(active?'active':'')} onClick={()=>onChange(key,value)}>{label}</button>
  return <><aside className={'filter-panel '+(open?'open':'')} aria-hidden={!open}>
    <div className="filter-panel-head"><div><span>TIENDA</span><h2>FILTRAR / ORDENAR</h2></div><button onClick={onClose}>×</button></div>
    <div className="filter-groups">
      <section><h3>CATEGORÍA</h3>{option('cat','Todos','Todas',filters.cat==='Todos')}{categories.filter(c=>c.enabled).map(c=><span key={c.id}>{option('cat',c.name,c.name,filters.cat===c.name)}</span>)}</section>
      <section><h3>TALLA</h3>{option('size','','Todas',!filters.size)}{sizes.map(s=><span key={s}>{option('size',s,s,filters.size===s)}</span>)}</section>
      <section><h3>FIT</h3>{option('fit','','Todos',!filters.fit)}{fits.filter(f=>f.enabled).map(f=><span key={f.id}>{option('fit',f.name,f.name,filters.fit===f.name)}</span>)}</section>
      <section><h3>ORDENAR</h3>{option('sort','featured','Destacados',filters.sort==='featured')}{option('sort','new','Nuevos primero',filters.sort==='new')}{option('sort','name','Nombre A–Z',filters.sort==='name')}</section>
    </div>
    <div className="filter-actions"><button onClick={onClear}>LIMPIAR</button><button onClick={onClose}>VER {count} PRODUCTOS</button></div>
  </aside><div className={'filter-backdrop '+(open?'open':'')} onClick={onClose}></div></>
}
