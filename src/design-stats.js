import {matchesDevice} from './data.js';

export function designCategories(record,field,index){return field==='design_family'?record.families.map(id=>index.families.find(f=>f.id===id)?.label||id):[...new Set((record.values[field]||[]).map(id=>index.dictionary[id]))];}
export function aggregateDesigns({devices,papers,index,numeric,field,filters={},unit='records',denominator='all',bin=1}){
 const indices=[],units=new Map(),annual=new Map(),unknown=new Set();let maxYear=-Infinity;
 const numericField=numeric?.fields.findIndex(f=>f.id===field)??-1;
 const add=(map,key,categories,families,reported)=>{if(!map.has(key))map.set(key,{categories:new Set(),families:new Set(),reported:false});const u=map.get(key);u.reported||=reported;for(const c of categories)u.categories.add(c);for(const f of families)u.families.add(f);};
 devices.forEach((d,i)=>{if(!matchesDevice(d,filters,papers))return;indices.push(i);const r=index.records[i],key=unit==='papers'?d.paper:i,categories=designCategories(r,field,index),reported=numericField>=0?numeric.records[i].some(([f,v])=>f===numericField&&Number.isFinite(v)):categories.length>0;add(units,key,categories,r.families,reported);
  if(!Number.isInteger(d.year)){unknown.add(key);return;}maxYear=Math.max(maxYear,d.year);const year=Math.floor(d.year/bin)*bin;if(!annual.has(year))annual.set(year,new Map());add(annual.get(year),key,categories,r.families,reported);
 });
 const summarize=map=>{const counts=Object.create(null);let reporting=0;for(const u of map.values()){if(u.reported)reporting++;for(const c of u.categories)counts[c]=(counts[c]||0)+1;}const base=denominator==='reporting'?reporting:map.size;return {total:map.size,reporting,missing:map.size-reporting,denominator:base,counts};};
 const overall=summarize(units),counts=Object.entries(overall.counts).map(([category,count])=>({category,count,percent:overall.denominator?count/overall.denominator*100:null})).sort((a,b)=>b.count-a.count||a.category.localeCompare(b.category));
 const years=[];if(annual.size){const lo=Math.min(...annual.keys()),hi=Math.max(...annual.keys());for(let year=lo;year<=hi;year+=bin)years.push({year,end:Math.min(year+bin-1,maxYear),...summarize(annual.get(year)||new Map())});}
 const families=index.families.map(f=>({...f,count:[...units.values()].filter(u=>u.families.has(f.id)).length,total:units.size}));
 return {indices,...overall,counts,years,families,unknownYear:unknown.size,unit,field,bin,denominatorBasis:denominator,population:{...filters}};
}
export function supportingDesignRecords(aggregate,devices,index,category,year=null){return aggregate.indices.filter(i=>(year==null||(Number.isInteger(devices[i].year)&&Math.floor(devices[i].year/aggregate.bin)*aggregate.bin===year))&&designCategories(index.records[i],aggregate.field,index).includes(category));}
export function designSeriesCSVRows(aggregate,categories){return aggregate.years.flatMap(y=>categories.map(category=>({period_start:y.year,period_end:y.end,category,count:y.counts[category]||0,denominator:y.denominator,share_percent:y.denominator?(y.counts[category]||0)/y.denominator*100:'',total_entries:y.total,reporting_entries:y.reporting,missing_entries:y.missing,unit:aggregate.unit,denominator_basis:aggregate.denominatorBasis,field:aggregate.field,population_filters:JSON.stringify(aggregate.population)})));}
