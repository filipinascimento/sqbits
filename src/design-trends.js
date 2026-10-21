import {select,scaleLinear,axisBottom,axisLeft,line} from 'd3';
import {esc,fmt,pretty,toCSV,download} from './data.js';
import {createSeriesStyles} from './chart-colors.js';
import {aggregateDesigns,supportingDesignRecords,designSeriesCSVRows} from './design-stats.js';
import {mountDesignDistributions} from './design-distributions.js';
import {mountYearRange} from './year-range.js';

export function mountDesignTrends(container,{devices,papers,index,numeric,state,onSelect}){
 let distributions,aggregate,selected=new Set(),limit=30,search='',destroyed=false,selection=[],searchIndex;
 const stylesByField=new Map();let seriesStyles;
 const defaults=()=>({scope:'individual_qubit',realization:'measured_device',attribution:'own_work'});
 state.filters??=defaults();state.field??='qubit_type';state.unit??='records';state.denominator??='all';state.bin??=1;state.mode??='share';
 const options=(values,value,all=false)=>(all?'<option value="">All</option>':'')+values.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`).join('');
 const unique=key=>[...new Set(devices.map(d=>d[key]))].sort().map(v=>[v,pretty(v)]);
 const allFields=[...index.fields,...numeric.fields],currentField=()=>allFields.find(f=>f.id===state.field),isNumeric=()=>currentField().kind==='numeric';
 const fieldOptions=index.families.map(f=>`<optgroup label="${esc(f.label)}">${options(allFields.filter(x=>x.family===f.id).map(x=>[x.id,x.label+(x.unit?' ['+x.unit+']':'')]),state.field)}</optgroup>`).join('');
 container.innerHTML=`<div class="explorer-layout design-trends-layout"><details class="filters-panel" open><summary>Explore design choices</summary><div class="filter-body">
 <section class="design-picker" aria-label="Choose design series">
 <label class="field">Find a design choice or category<input id="category-search" type="search" placeholder="Search fields and reported categories…" aria-controls="design-field-results design-category-list"></label>
 <div id="design-field-results" class="design-field-results" aria-label="Matching design fields" hidden></div>
 <label class="field">Design choice<select id="design-field">${options([['design_family','Design-family reporting']],state.field)}${fieldOptions}</select></label>
 <div id="design-category-controls" class="categorical-only"><div class="design-picker-tools"><span id="design-series-count" aria-live="polite"></span><label class="field"><span class="sr-only">Plot top</span><select id="category-top" aria-label="Plot top categories">${options([['','Custom selection'],[6,'Top 6'],[9,'Top 9'],[12,'Top 12']],6)}</select></label></div>
 <div id="design-category-list" class="design-category-list"></div><button id="more-design-categories" class="design-more">Show more categories</button>
 </div>
 <div id="design-coverage" class="design-coverage"></div>
 <details class="design-field-help"><summary>Reporting &amp; category definitions</summary><p id="design-field-note"></p><p>Choose up to 12 categories to plot. The arrow beside a category opens its supporting devices. Search does not change the population.</p></details>
 </section>
 <section class="design-population" aria-label="Population filters"><h3>Population</h3>
 <label class="field">Search devices / papers<input id="design-search" type="search" value="${esc(state.filters.search||'')}" placeholder="Device, paper, material…"></label>
 ${[['scope','Entity scope'],['realization','Realization'],['attribution','Attribution'],['type','Qubit family'],['review','Extraction review']].map(([key,label])=>`<label class="field">${label}<select id="design-${key}">${options(key==='review'?[['clear','No automated flag'],['flagged','Review flagged']]:unique(key),state.filters[key],true)}</select></label>`).join('')}
 <div id="design-year-range"></div><button id="reset-design-population">Reset population</button>
 </section><section class="design-count-settings" aria-label="Counting settings"><h3>Counting</h3>
 <label class="field">Count<select id="design-unit">${options([['records','Device records'],['papers','Distinct papers']],state.unit)}</select></label>
 <label class="field categorical-only">Share denominator<select id="design-denominator">${options([['all','All filtered entries'],['reporting','Entries reporting this field']],state.denominator)}</select></label>
 <label class="field categorical-only">Time periods<select id="design-bin">${options([[1,'Each year'],[3,'Three-year periods'],[5,'Five-year periods']],state.bin)}</select></label>
 <p class="filter-note">Default: own-work, measured individual qubits. Each entry counts once per category; paper counts merge matching records. Records are not globally deduplicated physical devices.</p></section></div></details>
 <div class="visual-column design-trend-panels">
 <section class="visual-panel design-comparison-panel"><div class="visual-heading"><div><h2 id="design-heading"></h2><p id="design-series-heading"></p></div><div class="visual-actions categorical-only"><label class="field">Value<select id="design-value-mode" aria-label="Plot value">${options([['share','Share (%)'],['count','Count']],state.mode)}</select></label><button id="export-design-series">Yearly CSV ↓</button><button id="export-design-breakdown">Overall CSV ↓</button></div></div>
 <div id="design-comparison" class="design-comparison"><section class="design-overall categorical-only"><h3>Overall distribution · selected years</h3><div id="design-overall-chart" class="design-overall-chart"></div></section><section class="design-yearly categorical-only"><h3>By publication year</h3><div id="design-time-chart" class="design-time-chart"></div></section><div id="design-numeric-distribution" hidden></div></div>
 <div id="design-series-legend" class="design-series-legend categorical-only"></div><p class="design-plot-note categorical-only" id="design-time-note"></p></section>
 <section class="visual-panel"><div class="visual-heading"><div><span class="eyebrow">REPORTING COVERAGE</span><h2>Which design families are described?</h2></div></div><div id="design-family-coverage" class="design-family-coverage"></div><p class="design-plot-note">Share of all filtered entries reporting at least one choice in each family, including numeric parameters. Families overlap. Click a family to plot its reporting share over time.</p></section>
 <details class="design-method"><summary>How categories and shares are counted</summary><p>${esc(index.category_policy)}</p><p>Shares are presence per entry, not the number of extraction rows or experimental repetitions. Entries can report multiple categories, so shares need not sum to 100%. Missing reporting is separate from explicit absence. Zero-denominator periods are gaps. Undated entries are included in overall breakdowns and excluded from time plots. Years come from paper metadata, not independently established first demonstrations.</p><p>These plots summarize automated reported design statements; their coverage is not a survey of every superconducting device. Review flags and original source evidence remain available.</p></details>
 </div><aside id="selection-panel" class="selection-panel" aria-label="Selected papers and devices"></aside></div>`;
 const el=id=>container.querySelector('#'+id);
 const color=category=>seriesStyles.get(category).color;
 const unitLabel=()=>state.unit==='papers'?'papers':'device records';
 function choose(category,year=null){selection=supportingDesignRecords(aggregate,devices,index,category,year);onSelect(selection);}
 const normalize=value=>pretty(value).toLowerCase();
 const fieldText=field=>normalize(field.label+' '+(field.unit||'')+' '+(index.families.find(f=>f.id===field.family)?.label||''));
 function matchingCategories(){
  const field=currentField(),query=normalize(search.trim());
  const rows=[...aggregate.counts,...[...selected].filter(c=>!aggregate.counts.some(r=>r.category===c)).map(category=>({category,count:0,percent:aggregate.denominator?0:null}))];
  return !query||fieldText(field).includes(query)?rows:rows.filter(r=>normalize(r.category).includes(query));
 }
 function searchFields(){
  const host=el('design-field-results'),query=normalize(search.trim());host.hidden=!query;host.innerHTML='';if(!query)return;
  // Build the available category index once per population, only when searching.
  // Searching chooses series; it never changes the population or its denominator.
  if(!searchIndex){
   searchIndex=new Map(allFields.map(f=>[f.id,new Set()]));
   for(const i of aggregate.indices){const record=index.records[i];for(const [field,ids] of Object.entries(record.values))for(const id of ids)searchIndex.get(field)?.add(id);for(const family of record.families)searchIndex.get('design_family').add(index.families.find(f=>f.id===family)?.label||family);}
  }
  const hits=allFields.filter(f=>f.id!==state.field).map(field=>({field,labelMatch:fieldText(field).includes(query),count:[...searchIndex.get(field.id)].filter(id=>normalize(field.id==='design_family'?id:index.dictionary[id]).includes(query)).length})).filter(r=>r.labelMatch||r.count).sort((a,b)=>Number(b.labelMatch)-Number(a.labelMatch)||b.count-a.count||a.field.label.localeCompare(b.field.label));
  host.innerHTML=hits.length?`<span class="design-search-heading">Matching fields</span>${hits.map(({field,count})=>`<button data-search-field="${esc(field.id)}"><span>${esc(field.label)}${field.unit?' ['+esc(field.unit)+']':''}</span><small>${count?fmt(count)+' matching '+(count===1?'category':'categories'):esc(index.families.find(f=>f.id===field.family)?.label||'Reporting')}</small></button>`).join('')}`:'<span class="filter-note">No other matching fields in this population.</span>';
  for(const button of host.querySelectorAll('[data-search-field]'))button.onclick=()=>{state.field=button.dataset.searchField;el('design-field').value=state.field;limit=30;update(true);};
 }
 function renderCategories(){
  const rows=matchingCategories();
  el('design-series-count').textContent=`${selected.size} / 12 selected`;
  el('design-category-list').innerHTML=rows.slice(0,limit).map(r=>`<div class="design-category-row"><label><input type="checkbox" data-plot-category="${esc(r.category)}" ${selected.has(r.category)?'checked':''}><span class="category-color" style="background:${color(r.category)}"></span><span class="design-category-name">${esc(pretty(r.category))}<small>${fmt(r.count)} · ${r.percent==null?'Share undefined':fmt(r.percent)+'%'}</small></span></label><button data-show-category="${esc(r.category)}" aria-label="View supporting devices for ${esc(r.category)}" title="View supporting devices">↗</button></div>`).join('')||'<p class="filter-note">No matching categories in this field. Choose a matching field above or try another search.</p>';
  el('more-design-categories').hidden=rows.length<=limit;el('more-design-categories').textContent=`Show more categories (${fmt(Math.max(0,rows.length-limit))} remaining)`;
  for(const box of el('design-category-list').querySelectorAll('[data-plot-category]'))box.onchange=()=>{if(box.checked&&selected.size>=12){box.checked=false;el('design-series-count').textContent='Limit: 12 categories';return;}if(box.checked)selected.add(box.dataset.plotCategory);else selected.delete(box.dataset.plotCategory);el('category-top').value='';el('design-series-count').textContent=`${selected.size} / 12 selected`;drawTime();};
  for(const button of el('design-category-list').querySelectorAll('[data-show-category]'))button.onclick=()=>choose(button.dataset.showCategory);
 }
 function overallRows(){const counts=new Map(aggregate.counts.map(r=>[r.category,r]));return [...selected].map(category=>counts.get(category)||{category,count:0,percent:aggregate.denominator?0:null});}
 function drawOverall(){
  const host=el('design-overall-chart'),rows=overallRows(),maximum=Math.max(1,...rows.map(r=>r.count));
  host.innerHTML=rows.map(row=>{
   const {category}=row,value=state.mode==='count'?row.count:row.percent,width=state.mode==='count'?row.count/maximum*100:row.percent||0;
   return `<button class="design-overall-bar" data-category="${esc(category)}" data-count="${row.count}" data-share="${row.percent??''}" data-value="${value??''}" title="${esc(pretty(category))}: ${fmt(row.count)} / ${fmt(aggregate.denominator)} ${unitLabel()}${row.percent==null?' · share undefined':' · '+fmt(row.percent)+'%'}"><span class="design-overall-label">${esc(pretty(category))}</span><span class="design-overall-value">${value==null?'—':fmt(value)+(state.mode==='share'?'%':'')}</span><span class="design-overall-track"><i style="width:${width}%;background:${color(category)}"></i></span><small>${state.mode==='share'?fmt(row.count)+' '+unitLabel():row.percent==null?'Share undefined':fmt(row.percent)+'%'}</small></button>`;
  }).join('')||'<p class="empty-small">Select a category to plot.</p>';
  for(const button of host.querySelectorAll('.design-overall-bar'))button.onclick=()=>choose(button.dataset.category);
 }
 function drawTime(){
  if(destroyed||!aggregate)return;
  const numericMode=isNumeric();for(const item of container.querySelectorAll('.categorical-only'))item.hidden=numericMode;
  el('design-numeric-distribution').hidden=!numericMode;el('design-comparison').classList.toggle('numeric-mode',numericMode);
  if(numericMode){
   el('design-series-heading').textContent='Distribution · converted point values · '+unitLabel();
   el('design-time-chart').innerHTML='';el('design-overall-chart').innerHTML='';el('design-series-legend').innerHTML='';
   if(distributions)distributions.update(state.field);else distributions=mountDesignDistributions(el('design-numeric-distribution'),{devices,papers,index,numeric,field:state.field,selector:false,getPopulation:()=>aggregate,onSelect:indices=>{selection=indices;onSelect(indices);}});
   return;
  }
  const host=el('design-time-chart'),width=Math.max(300,host.clientWidth||700),height=330,margin={left:62,right:22,top:20,bottom:50},w=width-margin.left-margin.right,h=height-margin.top-margin.bottom,years=aggregate.years;
  seriesStyles.sync(selected);
  for(const box of el('design-category-list').querySelectorAll('[data-plot-category]'))box.closest('.design-category-row').querySelector('.category-color').style.background=color(box.dataset.plotCategory);
  drawOverall();
  host.innerHTML='';el('design-series-heading').textContent=(state.mode==='share'?'Category shares':'Category counts')+' · '+unitLabel();
  el('design-series-legend').innerHTML=[...selected].map(c=>{const style=seriesStyles.get(c);return `<span data-category="${esc(c)}"><svg class="series-swatch" viewBox="0 0 32 12" aria-hidden="true"><path d="M1 6H31" stroke="${style.color}" stroke-width="2.5" stroke-dasharray="${style.dash}"/><circle cx="16" cy="6" r="2.7" fill="${style.color}" stroke="#fffefa" stroke-width="1"/></svg>${esc(pretty(c))}</span>`;}).join('');
  el('design-time-note').textContent=`${state.mode==='share'?'Denominator: '+(state.denominator==='all'?'all filtered entries':'entries reporting this field')+'. ':''}Click a point or an overall bar to inspect supporting devices. Categories can overlap. ${fmt(aggregate.unknownYear)} undated ${unitLabel()} are included only in the overall bars. Overall shares use pooled counts, not an average of yearly shares.`;
  el('export-design-series').disabled=!years.length||!selected.size;el('export-design-breakdown').disabled=!selected.size;
  if(!years.length||!selected.size){host.innerHTML='<div class="empty-state"><p>'+(!years.length?'No dated entries in this population.':!aggregate.counts.length?'No reported categories for this field in the current population.':'Select at least one category to plot.')+'</p></div>';return;}
  const x=scaleLinear().domain(years.length===1?[years[0].year-.5,years[0].year+.5]:[years[0].year-.15,years.at(-1).year+.15]).range([0,w]);
  const value=(year,c)=>state.mode==='count'?(year.counts[c]||0):year.denominator?(year.counts[c]||0)/year.denominator*100:null;
  const maximum=Math.max(1,...years.flatMap(y=>[...selected].map(c=>value(y,c)||0))),y=scaleLinear().domain([0,state.mode==='share'?100:maximum]).range([h,0]);if(state.mode==='count')y.nice();
  const svg=select(host).append('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('role','img').attr('aria-label','Design category '+(state.mode==='share'?'share':'count')+' over publication time'),g=svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);
  g.append('g').attr('class','design-grid').call(axisLeft(y).ticks(5).tickSize(-w).tickFormat(''));g.append('g').call(axisLeft(y).ticks(5).tickFormat(v=>fmt(v)+(state.mode==='share'?'%':'')));
  const step=Math.max(1,Math.ceil(years.length/7)),ticks=years.filter((_,i)=>i%step===0||i===years.length-1).map(y=>y.year),byYear=new Map(years.map(y=>[y.year,y]));
  g.append('g').attr('transform',`translate(0,${h})`).call(axisBottom(x).tickValues(ticks).tickFormat(v=>{const year=byYear.get(v);return year.end===year.year?String(v):`${v}–${String(year.end).slice(-2)}`;}));
  svg.append('text').attr('x',margin.left+w/2).attr('y',height-8).attr('text-anchor','middle').attr('class','design-axis-label').text('Paper publication year');
  const tip=document.createElement('div');tip.className='design-chart-tooltip';tip.hidden=true;host.append(tip);
  for(const category of selected){const points=years.map(year=>({...year,value:value(year,category)})),style=seriesStyles.get(category);
   g.append('path').datum(points).attr('class','design-share-line').attr('data-category',category).attr('fill','none').attr('stroke',style.color).attr('stroke-width',2.5).attr('stroke-dasharray',style.dash||null).attr('d',line().defined(d=>d.value!=null).x(d=>x(d.year)).y(d=>y(d.value)));
   g.selectAll(null).data(points.filter(d=>d.value!=null)).enter().append('circle').attr('class','design-share-point').attr('data-category',category).attr('cx',d=>x(d.year)).attr('cy',d=>y(d.value)).attr('r',3.7).attr('fill',style.color).attr('tabindex',0).attr('role','button').attr('aria-label',d=>`${pretty(category)}, ${d.year} to ${d.end}: ${d.counts[category]||0} ${unitLabel()}`)
    .on('pointerenter focus',(event,d)=>{tip.innerHTML=`<strong>${esc(pretty(category))}</strong><span>${d.year}${d.end!==d.year?'–'+d.end:''} · ${fmt(d.counts[category]||0)} / ${fmt(d.denominator)} ${unitLabel()}</span><span>${d.denominator?fmt((d.counts[category]||0)/d.denominator*100)+'%':'Share undefined'} · ${fmt(d.reporting)} reporting / ${fmt(d.total)} total</span>`;tip.hidden=false;tip.style.left=Math.max(8,Math.min(width-260,margin.left+x(d.year)+10))+'px';tip.style.top=Math.max(8,margin.top+y(d.value)-70)+'px';})
    .on('pointerleave blur',()=>{tip.hidden=true;}).on('click',(_,d)=>choose(category,d.year)).on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(category,d.year);}});
  }
 }
 function update(resetSeries=false){
  aggregate=aggregateDesigns({devices,papers,index,numeric,...state});searchIndex=null;if(resetSeries){selected=new Set();selected=new Set(matchingCategories().slice(0,6).map(r=>r.category));el('category-top').value='6';}
  if(!stylesByField.has(state.field))stylesByField.set(state.field,createSeriesStyles(aggregate.counts.map(r=>r.category)));
  seriesStyles=stylesByField.get(state.field);seriesStyles.sync(selected);
  const field=currentField(),numericMode=isNumeric();el('design-heading').textContent=field.label+(field.unit?' ['+field.unit+']':'');
  el('design-coverage').innerHTML=[['Filtered '+unitLabel(),aggregate.total],[numericMode?'With converted point values':'Reporting this field',aggregate.reporting],[numericMode?'No converted point values':'Not reported',aggregate.missing]].map(([label,count])=>`<div><span>${esc(label)}</span><strong>${fmt(count)}</strong></div>`).join('');
  el('design-field-note').textContent=numericMode?`${fmt(aggregate.reporting)} / ${fmt(aggregate.total)} ${unitLabel()} have converted point values in ${field.unit}. Bounds, ranges and unconverted values remain in device evidence; absence from this histogram does not mean the property was unreported. Each entry counts once per bin, and configurations may span multiple bins.`:`${fmt(aggregate.indices.length)} extracted device records contribute. ${fmt(aggregate.total?aggregate.reporting/aggregate.total*100:0)}% of ${unitLabel()} report this field. Shares use ${state.denominator==='all'?'all '+unitLabel():'only reporting '+unitLabel()} as the denominator. ${field.kind==='verbatim'?'Categories preserve reported wording; wording variants remain separate.':field.id==='material_family'?'Material names can describe films, barriers or housings. Inspect component labels and reported wording to distinguish their roles.':field.kind==='explicit_mentions'?'Families group explicit names from the reported substrate field.':'Categories follow the extracted classification or explicitly linked process steps.'}`;
  el('design-family-coverage').innerHTML=aggregate.families.map(f=>`<button data-design-family="${esc(f.id)}"><span>${esc(f.label)}</span><span class="design-coverage-track"><i style="width:${f.total?f.count/f.total*100:0}%"></i></span><strong>${fmt(f.total?f.count/f.total*100:0)}%</strong><small>${fmt(f.count)} / ${fmt(f.total)}</small></button>`).join('');
  for(const button of el('design-family-coverage').querySelectorAll('button'))button.onclick=()=>{state.field='design_family';el('design-field').value=state.field;selected=new Set([index.families.find(f=>f.id===button.dataset.designFamily).label]);update();container.querySelector('.visual-column').scrollTop=0;};
  selection=[];onSelect([]);searchFields();renderCategories();drawTime();
  if(resetSeries)container.querySelector('.visual-column').scrollTop=0;
 }
 let timer;
 for(const key of ['scope','realization','attribution','type','review','search'])el('design-'+key).addEventListener(key==='search'?'input':'change',e=>{state.filters[key]=e.target.value;clearTimeout(timer);timer=setTimeout(()=>update(),key==='search'?150:0);});
 const yearRange=mountYearRange(el('design-year-range'),{nodes:devices,filters:state.filters,inputIds:['design-yearMin','design-yearMax'],onCommit:range=>{Object.assign(state.filters,range);clearTimeout(timer);timer=setTimeout(()=>update(),100);}});
 for(const [id,key,convert] of [['design-field','field',String],['design-unit','unit',String],['design-denominator','denominator',String],['design-bin','bin',Number]])el(id).onchange=e=>{state[key]=convert(e.target.value);if(key==='field'){search='';el('category-search').value='';}limit=30;update(key==='field');};
 el('reset-design-population').onclick=()=>{clearTimeout(timer);state.filters=defaults();yearRange.set(state.filters);for(const key of ['scope','realization','attribution','type','review','search'])el('design-'+key).value=state.filters[key]||'';update();};
 let searchTimer;
 el('category-search').oninput=e=>{search=e.target.value;limit=30;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{searchFields();renderCategories();},120);};el('more-design-categories').onclick=()=>{limit+=40;renderCategories();};
 el('category-top').onchange=e=>{if(!e.target.value)return;selected=new Set(matchingCategories().slice(0,+e.target.value).map(r=>r.category));renderCategories();drawTime();};
 el('design-value-mode').onchange=e=>{state.mode=e.target.value;drawTime();};
 el('export-design-series').onclick=()=>download(`sqbits-design-${state.field}-over-time.csv`,toCSV(designSeriesCSVRows(aggregate,[...selected])));
 el('export-design-breakdown').onclick=()=>download(`sqbits-design-${state.field}-breakdown.csv`,toCSV(overallRows().map(r=>({...r,unit:state.unit,denominator:aggregate.denominator,denominator_basis:state.denominator,reporting_entries:aggregate.reporting,missing_entries:aggregate.missing,total_entries:aggregate.total,undated_entries:aggregate.unknownYear,field:state.field,population_filters:JSON.stringify(state.filters)}))));
 let frame;const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>drawTime());});observer.observe(el('design-time-chart'));
 if(matchMedia('(max-width:720px)').matches)container.querySelector('.filters-panel').open=false;
 // Defer the initial callback until the shared evidence panel has mounted.
 queueMicrotask(()=>{if(!destroyed)update(true);});
 return {get aggregate(){return aggregate;},get selected(){return selection;},selectCategory:choose,clearSelection(){selection=[];onSelect([]);},destroy(){destroyed=true;clearTimeout(timer);clearTimeout(searchTimer);cancelAnimationFrame(frame);yearRange.destroy();distributions?.destroy();observer.disconnect();}};
}
