import {esc} from './data.js';

export const CATEGORY_FIX_PACKAGE='fixes/material-substrate-v1';
const properties={superconductor_composition:'material',substrate_material:'substrate'};
// An additive overlay: original node objects, observations, dictionary and edges
// are never mutated. Fail closed if the source identity or original value differs.
export function applyCategoryFixes(data,fixes,sourceManifest){
 if(fixes.source_manifest_sha256!==sourceManifest||data.nodes.length!==fixes.device_count)throw new Error('Category fix/data snapshot mismatch');
 const nodes=data.nodes.slice();
 for(const [i,u] of Object.entries(fixes.devices)){
  const d=data.nodes[i];if(!d||d.id!==u.id)throw new Error('Category fix/device identity mismatch');
  const changed={...d};
  for(const key of Object.values(properties))if(u[key]){
   if(d[key]!==u[key].from)throw new Error('Category fix/original value mismatch');
   changed[key+'Reported']=d[key];changed[key]=u[key].to;
  }
  nodes[i]=changed;
 }
 return {...data,nodes};
}
export function applyDesignCategoryFixes(index,fixes){
 if(index.source_manifest_sha256!==fixes.source_manifest_sha256||index.devices_sha256!==fixes.devices_sha256||index.records.length!==fixes.device_count)throw new Error('Design category fix/index snapshot mismatch');
 const dictionary=index.dictionary.slice(),lookup=new Map(dictionary.map((v,i)=>[v,i])),maps={};
 const id=value=>{if(!lookup.has(value)){lookup.set(value,dictionary.length);dictionary.push(value);}return lookup.get(value);};
 for(const [field,changes] of Object.entries(fixes.dictionary_maps))maps[field]=new Map(Object.entries(changes).map(([i,change])=>{if(index.dictionary[i]!==change.from)throw new Error('Category fix/original dictionary mismatch');return [+i,id(change.to)];}));
 const fields=index.fields.flatMap(f=>properties[f.id]?[{...f,label:f.id==='superconductor_composition'?'Superconductor composition (grouped)':'Substrate material (grouped)',kind:'normalized'},{...f,id:f.id+'_reported',label:f.id==='superconductor_composition'?'Superconductor composition (original wording)':'Substrate material (original wording)'}]:[f]);
 const records=index.records.map(r=>{
  const values={...r.values};
  for(const [field,map] of Object.entries(maps))if(values[field]){values[field+'_reported']=values[field];values[field]=[...new Set(values[field].map(i=>map.get(i)??i))];}
  return {...r,values};
 });
 return {...index,dictionary,fields,records,normalization_package:fixes.package_id,category_policy:index.category_policy+' Composition fields marked “grouped” apply the controlled material-substrate-v1 alias package; original-wording fields preserve every original description.'};
}
export function categoryFixesHTML(detail,fixes){
 const rows=detail.record.design_choices.flatMap((o,i)=>{
  const r=fixes.aliases[o.property_name]?.[o.reported_text];
  return r&&r.rule!=='unresolved'&&r.value!==o.reported_text?[{o,r,i}]:[];
 });
 if(!rows.length)return '';
 return `<details class="category-normalization"><summary>Material & substrate grouping · ${rows.length} naming ${rows.length===1?'fix':'fixes'}</summary><p>Grouped composition labels preserve the original wording and qualifiers below.</p><dl>${rows.map(({o,r,i})=>`<dt>${o.property_name==='substrate_material'?'Substrate':'Material'}${o.component?' · '+esc(o.component):''}</dt><dd><span>${esc(o.reported_text)}</span> → <strong>${esc(r.value)}</strong><small>Choice ${i+1} · ${esc(fixes.rules[r.rule])}</small></dd>`).join('')}</dl><a href="${(import.meta.env?.BASE_URL||'/sqbits/')+'data/'+CATEGORY_FIX_PACKAGE+'/package.zip'}">Fix package & source provenance</a></details>`;
}
