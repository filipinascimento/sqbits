export const auditLabel=action=>({confirm:'Confirmed',correct:'Corrected',exclude:'Excluded',unresolved:'Needs review',reclassified:'Reclassified'}[action]||action);
// Corrections are a separate, source-linked layer. Never mutate raw loaded rows.
export function auditPoint(point,metric,audit){
 const fix=audit?.findings?.[`${metric}:${point.id}`];if(!fix)return point;
 if(fix.original_value!==point.value)throw new Error('PDF audit does not match this data snapshot');
 const corrected=fix.action==='correct',value=corrected&&fix.value!=null?fix.value:point.value;
 const origin=corrected&&fix.origin?fix.origin:point.origin,nature=corrected&&fix.nature?fix.nature:point.nature;
 const eligible=point.eligible&&fix.frontier_eligible!==false&&origin==='measured'&&['exact','approximate','with_uncertainty'].includes(nature)&&!['exclude','unresolved'].includes(fix.action);
 return {...point,value,origin,nature,eligible,attribution:fix.attribution||null,excluded:fix.action==='exclude',quarantined:fix.action==='unresolved',audit:fix,rawValue:point.value,rawOrigin:point.origin,rawNature:point.nature,...(Math.abs(value-point.value)>Math.max(1e-12,Math.abs(point.value)*1e-10)?{minus:null,plus:null}:{})};
}
export function auditDevices(data,audit){
 if(!audit?.device_best)return data;
 return {...data,nodes:data.nodes.map((d,i)=>Object.hasOwn(audit.device_best,i)?{...d,best:{...audit.device_best[i]}}:d)};
}

export function auditedRows(rows,metric,audit){
 const result=rows.map(p=>auditPoint(p,metric,audit));
 for(const entry of audit?.reclassifications||[]){if(entry.target_metric!==metric)continue;
  const f={...entry,action:'correct'},key=`${entry.metric}:${entry.point.id}`;
  const p=auditPoint(entry.point,entry.metric,{findings:{[key]:f}});
  result.push({...p,sourceMetric:entry.metric,audit:{...entry,action:'reclassified'},name:entry.corrected_name||p.name});
 }
 return result;
}
