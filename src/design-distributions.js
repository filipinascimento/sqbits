import {select,scaleLinear,scaleLog,axisBottom,axisLeft,bin,format} from 'd3';
import {esc,fmt,pretty} from './data.js';
import {designCategories} from './design-stats.js';

// Numeric fields are partitioned by canonical unit. Distinct values/configurations
// remain distinct; an entry counts once in any one bin/category.
export function distributionBins(rows,{log=false,count=16}={}){
 const values=rows.map(r=>r.value).filter(Number.isFinite);if(!values.length)return [];
 let lo=Math.min(...values),hi=Math.max(...values);if(lo===hi){const pad=Math.abs(lo)*.05||.5;lo-=pad;hi+=pad;log=false;}
 const transform=log?Math.log10:v=>v,inverse=log?v=>10**v:v=>v;
 const domain=[transform(lo),transform(hi)],buckets=bin().value(r=>transform(r.value)).domain(domain).thresholds(count)(rows);
 return buckets.filter(b=>b.length).map(b=>({min:inverse(b.x0),max:inverse(b.x1),rows:[...b],count:new Set(b.map(r=>r.key)).size}));
}
export function mountDesignDistributions(host,{devices,papers,index,numeric,getPopulation=()=>({indices:devices.map((_,i)=>i),unit:'records'}),onSelect=()=>{}}){
 const choices=new Map(),limits=new Map();let population,dead=false;
 const allFields=[...index.fields.filter(f=>f.id!=='design_family'),...numeric.fields];
 const defaults={qubit:'qubit_type',materials:'material_family',interfaces:'substrate_family',geometry:'geometry',fabrication:'fabrication_operation',junction:'junction_stack',architecture:'coupling_mechanism',circuit:'numeric:energy_ratio:1'};
 host.innerHTML=`<div class="distribution-intro"><h2>Design choices by part</h2><p>Categorical bars count entries reporting each category. Numeric histograms use converted point values in the stated unit; bounds, ranges and unconverted quantities stay in device evidence. Click a bar to inspect its entries.</p></div><div class="part-distributions">${index.families.map(f=>{
  const fields=allFields.filter(x=>x.family===f.id);if(!fields.length)return '';
  const first=fields.find(x=>x.id===defaults[f.id])||fields.find(x=>x.kind==='numeric')||fields[0];choices.set(f.id,first.id);
  return `<section class="part-distribution visual-panel" data-family="${f.id}"><div class="part-heading"><h3>${esc(f.label)}</h3><label class="field">Property<select data-part-field="${f.id}">${fields.map(x=>`<option value="${esc(x.id)}" ${x===first?'selected':''}>${esc(x.label)}${x.unit?' ['+esc(x.unit)+']':''}</option>`).join('')}</select></label></div><div class="part-chart" data-part-chart="${f.id}"></div></section>`;
 }).join('')}</div>`;
 const chartFor=id=>host.querySelector(`[data-part-chart="${id}"]`);
 function draw(family){
  if(dead)return;const field=allFields.find(f=>f.id===choices.get(family)),chart=chartFor(family);chart.innerHTML='';
  const key=i=>population.unit==='papers'?devices[i].paper:i,total=new Set(population.indices.map(key)).size;
  if(field.kind!=='numeric'){
   const categories=new Map(),reporting=new Set();for(const i of population.indices)for(const category of designCategories(index.records[i],field.id,index)){
    reporting.add(key(i));if(!categories.has(category))categories.set(category,{keys:new Set(),indices:[]});const c=categories.get(category);c.keys.add(key(i));c.indices.push(i);
   }
   const rows=[...categories].sort((a,b)=>b[1].keys.size-a[1].keys.size||a[0].localeCompare(b[0])),limit=limits.get(family)||12;
   chart.innerHTML=`<p class="part-coverage">${fmt(reporting.size)} / ${fmt(total)} ${population.unit==='papers'?'papers':'records'} reporting · ${fmt(total-reporting.size)} not reported</p><div class="category-histogram">${rows.slice(0,limit).map(([label,c],j)=>`<button data-part-bin="${j}" title="${esc(label)}"><span class="histogram-label">${esc(pretty(label))}</span><span class="histogram-track"><i style="width:${100*c.keys.size/(rows[0]?.[1].keys.size||1)}%"></i></span><strong>${fmt(c.keys.size)}</strong></button>`).join('')||'<p class="empty-small">No reported categories in this population.</p>'}</div>${rows.length>limit?'<button class="part-more">Show more categories</button>':''}`;
   chart.querySelectorAll('[data-part-bin]').forEach(b=>b.onclick=()=>onSelect(rows[+b.dataset.partBin][1].indices));
   chart.querySelector('.part-more')?.addEventListener('click',()=>{limits.set(family,limit+30);draw(family);});return;
  }
  const fieldId=numeric.fields.indexOf(field),rows=[];for(const i of population.indices)for(const [f,value] of numeric.records[i])if(f===fieldId)rows.push({value,index:i,key:key(i)});
  const reporting=new Set(rows.map(r=>r.key)).size,values=rows.map(r=>r.value),lo=Math.min(...values),hi=Math.max(...values),useLog=lo>0&&hi/lo>1000;
  chart.innerHTML=`<p class="part-coverage">${fmt(reporting)} / ${fmt(total)} ${population.unit==='papers'?'papers':'records'} with converted point values · ${fmt(rows.length)} distinct record values</p><div class="numeric-histogram"></div><p class="part-coverage">${esc(field.unit)}${useLog?' · logarithmic bins':''} · An entry counts once per bin; multiple configurations may span bins.</p>`;
  const target=chart.querySelector('.numeric-histogram');if(!rows.length){target.innerHTML='<p class="empty-small">No converted point values in this population.</p>';return;}
  const buckets=distributionBins(rows,{log:useLog}),width=Math.max(240,target.clientWidth||350),height=205,m={left:43,right:16,top:12,bottom:45},x=(useLog?scaleLog():scaleLinear()).domain([buckets[0].min,buckets.at(-1).max]).range([m.left,width-m.right]),y=scaleLinear().domain([0,Math.max(...buckets.map(b=>b.count))]).nice().range([height-m.bottom,m.top]);
  const svg=select(target).append('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('aria-label',field.label+' histogram in '+field.unit).attr('role','img');
  const tickCount=Math.max(2,Math.floor((width-m.left-m.right)/65)),ticks=x.ticks(tickCount),stride=Math.max(1,Math.ceil(ticks.length/tickCount));
  svg.append('g').attr('transform',`translate(0,${height-m.bottom})`).call(axisBottom(x).tickValues(ticks.filter((_,i)=>i%stride===0)).tickFormat(v=>v!==0&&(Math.abs(v)<.001||Math.abs(v)>=1e5)?format('.1~e')(v):format('.2~g')(v)));svg.append('g').attr('transform',`translate(${m.left},0)`).call(axisLeft(y).ticks(4).tickFormat(v=>Number.isInteger(v)?fmt(v):''));
  svg.append('text').attr('x',width/2).attr('y',height-6).attr('text-anchor','middle').text(field.unit);
  svg.selectAll('rect').data(buckets).join('rect').attr('x',b=>x(b.min)+1).attr('y',b=>y(b.count)).attr('width',b=>Math.max(1,x(b.max)-x(b.min)-2)).attr('height',b=>y(0)-y(b.count)).attr('tabindex',0).attr('role','button').attr('aria-label',b=>`${format('.4~g')(b.min)} to ${format('.4~g')(b.max)} ${field.unit}: ${b.count} entries`).on('click',(_,b)=>onSelect([...new Set(b.rows.map(r=>r.index))])).on('keydown',(e,b)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect([...new Set(b.rows.map(r=>r.index))]);}}).append('title').text(b=>`${format('.4~g')(b.min)}–${format('.4~g')(b.max)} ${field.unit}\n${b.count} entries`);
 }
 host.querySelectorAll('[data-part-field]').forEach(el=>el.onchange=()=>{choices.set(el.dataset.partField,el.value);limits.delete(el.dataset.partField);draw(el.dataset.partField);});
 const update=()=>{population=getPopulation();for(const family of choices.keys())draw(family);};
 let frame;const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(population)for(const f of choices.keys())if(allFields.find(x=>x.id===choices.get(f)).kind==='numeric')draw(f);});});observer.observe(host);
 update();return {update,focus(families){host.querySelectorAll('[data-family]').forEach(e=>e.classList.toggle('part-focused',families.includes(e.dataset.family)));},destroy(){dead=true;cancelAnimationFrame(frame);observer.disconnect();}};
}
