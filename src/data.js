import {interpolateViridis,schemeTableau10,schemeSet3} from 'd3';
export const pretty=s=>String(s??'Unknown').replaceAll('_',' ');
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt=n=>{const v=Number(n);return v!==0&&(Math.abs(v)<.001||Math.abs(v)>=1e8)?v.toExponential(3):v.toLocaleString('en-US',{maximumFractionDigits:3});};
const cache=new Map();
export async function load(path){if(!cache.has(path))cache.set(path,(async()=>{const r=await fetch((import.meta.env?.BASE_URL||'/sqbits/')+'data/'+path);if(!r.ok)throw new Error(`Unable to load ${path} (${r.status})`);if(!path.endsWith('.gz'))return r.json();const bytes=new Uint8Array(await r.arrayBuffer());if(bytes[0]!==31||bytes[1]!==139)return JSON.parse(new TextDecoder().decode(bytes));if(!globalThis.DecompressionStream)throw new Error('Please use a current browser with gzip DecompressionStream support.');return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();})());try{return await cache.get(path);}catch(e){cache.delete(path);throw e;}}
export const palette=[...schemeTableau10,...schemeSet3];
export function numeric(n,key){return key==='year'?n.year:key==='degree'?n.degree:key==='devices'?n.devices:n.best?.[key];}
export function encoding(nodes,key){
 const isNumeric=!['community','type','realization','attribution','scope','material','substrate','junction','geometry','review'].includes(key);
 const get=n=>key==='community'?n.communityLabel:key==='review'?(n.review?'Review flagged':'No automated flag'):n[key]||'Unknown';
 if(isNumeric){const values=nodes.map(n=>numeric(n,key)).filter(Number.isFinite);const lo=values.length?Math.min(...values):0,hi=values.length?Math.max(...values):1;
  const unit=['t1','t2_ramsey','t2_echo','t2_other','tphi'].includes(key)?' µs':key.endsWith('_time')?' ns':key.includes('fidelity')||key.includes('gate_error')||key==='readout_error'?' %':key.endsWith('_frequency')?' GHz':key==='resonator_linewidth'?' MHz':'';
  return {numeric:true,color:n=>{const v=numeric(n,key);return Number.isFinite(v)?interpolateViridis((v-lo)/(hi-lo||1)):'#a4ada9';},legend:[...(values.length?[{label:`${fmt(lo)} → ${fmt(hi)}${unit}`,color:interpolateViridis(.6)}]:[]),{label:'Not reported',color:'#a4ada9'}]};}
 const values=[...new Set(nodes.map(get))].sort();
 const categoryColor=v=>{if(['Unknown','No indexed connections','Insufficient shared design evidence'].includes(v))return '#b9c4b5';if(key==='review')return v==='Review flagged'?'#be944d':'#588373';const community=String(v).match(/^C(\d+) ·/);let hash=2166136261;for(const c of String(v))hash=Math.imul(hash^c.charCodeAt(0),16777619);return palette[(community?+community[1]-1:hash>>>0)%palette.length];};
 const colors=new Map(values.map(v=>[v,categoryColor(v)]));
 return {numeric:false,domain:values,get,color:n=>colors.get(get(n)),legend:values.map(label=>({label:pretty(label),color:colors.get(label)}))};
}
export function frontier(points,direction='max'){
 const annual=new Map();for(const p of points){if(!p.eligible)continue;const prev=annual.get(p.year);if(!prev||(direction==='min'?p.value<prev.value:p.value>prev.value))annual.set(p.year,p);}
 let best=direction==='min'?Infinity:-Infinity;const line=[];
 for(const p of [...annual.values()].sort((a,b)=>a.year-b.year)){if(direction==='min'?p.value<best:p.value>best){line.push(p);best=p.value;}}
 return line;
}
export function pointInPolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if(((a[1]>point[1])!==(b[1]>point[1]))&&(point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0]))inside=!inside;}return inside;}
export function matchesDevice(d,filters,papers){
 const {search='',type='',scope='',realization='',attribution='',community='',material='',substrate='',geometry='',review='',yearMin='',yearMax=''}=filters;
 return (!type||d.type===type)&&(!scope||d.scope===scope)&&(!geometry||d.geometry===geometry)&&(!substrate||d.substrate===substrate)&&(!realization||d.realization===realization)&&(!attribution||d.attribution===attribution)&&(!community||String(d.community)===community)&&(!material||d.material===material)&&(!review||(review==='flagged')===d.review)&&(!yearMin||(d.year!=null&&d.year>=+yearMin))&&(!yearMax||(d.year!=null&&d.year<=+yearMax))&&(!search||[d.label,d.type,d.material,d.substrate,d.junction,d.geometry,papers[d.paper].label].join(' ').toLowerCase().includes(search.toLowerCase()));
}
export function toCSV(rows){const columns=Object.keys(rows[0]||{});const q=v=>'"'+String(v??'').replaceAll('"','""')+'"';return [columns.map(q).join(','),...rows.map(r=>columns.map(c=>q(r[c])).join(','))].join('\n');}
export function download(name,content,type='text/csv'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
