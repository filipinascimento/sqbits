import {select,scaleLinear,axisBottom,axisLeft,line} from 'd3';
import {esc,fmt,pretty,encoding,toCSV,download} from './data.js';
import {aggregateDesigns,supportingDesignRecords,designSeriesCSVRows} from './design-stats.js';
import {mountYearRange} from './year-range.js';

export function mountDesignTrends(container,{devices,papers,index,state,onSelect}){
 let aggregate,selected=new Set(),limit=30,search='',destroyed=false,selection=[];
 const defaults=()=>({scope:'individual_qubit',realization:'measured_device',attribution:'own_work'});
 state.filters??=defaults();state.field??='qubit_type';state.unit??='records';state.denominator??='all';state.bin??=1;state.mode??='share';
 const options=(values,value,all=false)=>(all?'<option value="">All</option>':'')+values.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`).join('');
 const unique=key=>[...new Set(devices.map(d=>d[key]))].sort().map(v=>[v,pretty(v)]);
 const fieldOptions=index.families.map(f=>`<optgroup label="${esc(f.label)}">${options(index.fields.filter(x=>x.family===f.id).map(x=>[x.id,x.label]),state.field)}</optgroup>`).join('');
 container.innerHTML=`<div class="explorer-layout design-trends-layout"><details class="filters-panel" open><summary>Explore design choices</summary><div class="filter-body">
 <label class="field">Design choice<select id="design-field">${options([['design_family','Design-family reporting']],state.field)}${fieldOptions}</select></label>
 <label class="field">Count<select id="design-unit">${options([['records','Device records'],['papers','Distinct papers']],state.unit)}</select></label>
 <label class="field">Share denominator<select id="design-denominator">${options([['all','All filtered entries'],['reporting','Entries reporting this field']],state.denominator)}</select></label>
 ${[['scope','Entity scope'],['realization','Realization'],['attribution','Attribution'],['type','Qubit family'],['review','Extraction review']].map(([key,label])=>`<label class="field">${label}<select id="design-${key}">${options(key==='review'?[['clear','No automated flag'],['flagged','Review flagged']]:unique(key),state.filters[key],true)}</select></label>`).join('')}
 <label class="field">Search devices / papers<input id="design-search" type="search" value="${esc(state.filters.search||'')}" placeholder="Device, paper, material…"></label>
 <div id="design-year-range"></div>
 <label class="field">Time periods<select id="design-bin">${options([[1,'Each year'],[3,'Three-year periods'],[5,'Five-year periods']],state.bin)}</select></label>
 <button id="reset-design-population">Reset population</button><p class="filter-note">Default: own-work, measured individual qubits. Each record counts once per category; the paper option merges categories across its matching records. Records are not globally deduplicated physical devices.</p></div></details>
 <div class="visual-column design-trend-panels">
 <section class="visual-panel"><div class="visual-heading"><div><span class="eyebrow">DESIGN CHOICE DISTRIBUTIONS</span><h2 id="design-heading"></h2></div><button id="export-design-breakdown">Export breakdown CSV ↓</button></div><div id="design-coverage" class="design-coverage"></div><p id="design-field-note" class="design-plot-note"></p>
 <div class="design-category-tools"><label class="field">Find a category<input id="category-search" type="search" placeholder="Search all reported categories…"></label><label class="field">Plot top<select id="category-top">${options([[6,'6 categories'],[9,'9 categories'],[12,'12 categories']],6)}</select></label></div>
 <p class="design-plot-note">Choose up to 12 series. “View” shows supporting devices in the side panel. Reported wording is available in full; long lists load more rows on demand.</p>
 <div id="design-category-table" class="design-category-scroll"></div><button id="more-design-categories" class="design-more">Show more categories</button></section>
 <section class="visual-panel"><div class="visual-heading"><div><span class="eyebrow">CHANGE OVER TIME</span><h2 id="design-series-heading"></h2></div><div class="visual-actions"><label class="field">Value<select id="design-value-mode">${options([['share','Share (%)'],['count','Count']],state.mode)}</select></label><button id="export-design-series">Export plotted series CSV ↓</button></div></div>
 <div id="design-time-chart" class="design-time-chart"></div><div id="design-series-legend" class="design-series-legend"></div><p class="design-plot-note" id="design-time-note"></p></section>
 <section class="visual-panel"><div class="visual-heading"><div><span class="eyebrow">REPORTING COVERAGE</span><h2>Which design families are described?</h2></div></div><div id="design-family-coverage" class="design-family-coverage"></div><p class="design-plot-note">Share of all filtered entries reporting at least one choice in each family, including numeric parameters. Families overlap. Click a family to plot its reporting share over time.</p></section>
 <details class="design-method"><summary>How categories and shares are counted</summary><p>${esc(index.category_policy)}</p><p>Shares are presence per entry, not the number of extraction rows or experimental repetitions. Entries can report multiple categories, so shares need not sum to 100%. Missing reporting is separate from explicit absence. Zero-denominator periods are gaps. Undated entries are included in overall breakdowns and excluded from time plots. Years come from paper metadata, not independently established first demonstrations.</p><p>These plots summarize automated reported design statements; their coverage is not a survey of every superconducting device. Review flags and original source evidence remain available.</p></details>
 </div><aside id="selection-panel" class="selection-panel" aria-label="Selected papers and devices"></aside></div>`;
 const el=id=>container.querySelector('#'+id);
 const color=category=>encoding([{type:category}],'type').color({type:category});
 const unitLabel=()=>state.unit==='papers'?'papers':'device records';
 function choose(category,year=null){selection=supportingDesignRecords(aggregate,devices,index,category,year);onSelect(selection);}
 function categoriesTable(){
  const rows=aggregate.counts.filter(r=>r.category.toLowerCase().includes(search.toLowerCase()));
  el('design-category-table').innerHTML=`<table class="design-category-table"><thead><tr><th>Plot / category</th><th>Count</th><th>Share</th><th>Evidence</th></tr></thead><tbody>${rows.slice(0,limit).map(r=>`<tr><td><label><input type="checkbox" data-plot-category="${esc(r.category)}" ${selected.has(r.category)?'checked':''}><span class="category-color" style="background:${color(r.category)}"></span><span>${esc(pretty(r.category))}<span class="category-bar" style="width:${r.percent??0}%;background:${color(r.category)}"></span></span></label></td><td>${fmt(r.count)}</td><td>${r.percent==null?'—':fmt(r.percent)+'%'}</td><td><button data-show-category="${esc(r.category)}" aria-label="View supporting devices for ${esc(r.category)}">View</button></td></tr>`).join('')||'<tr><td colspan="4">No matching reported categories.</td></tr>'}</tbody></table>`;
  el('more-design-categories').hidden=rows.length<=limit;el('more-design-categories').textContent=`Show more categories (${fmt(Math.max(0,rows.length-limit))} remaining)`;
  for(const box of el('design-category-table').querySelectorAll('[data-plot-category]'))box.onchange=()=>{if(box.checked&&selected.size>=12){box.checked=false;el('design-series-heading').textContent='Plot up to 12 categories at once';return;}if(box.checked)selected.add(box.dataset.plotCategory);else selected.delete(box.dataset.plotCategory);drawTime();};
  for(const button of el('design-category-table').querySelectorAll('[data-show-category]'))button.onclick=()=>choose(button.dataset.showCategory);
 }
 function drawTime(){
  if(destroyed||!aggregate)return;const host=el('design-time-chart'),width=Math.max(300,host.clientWidth||700),height=330,margin={left:62,right:22,top:20,bottom:50},w=width-margin.left-margin.right,h=height-margin.top-margin.bottom,years=aggregate.years;
  host.innerHTML='';el('design-series-heading').textContent=(state.mode==='share'?'Category shares':'Category counts')+' · '+unitLabel();
  el('design-series-legend').innerHTML=[...selected].map(c=>`<span><i style="background:${color(c)}"></i>${esc(pretty(c))}</span>`).join('');
  el('design-time-note').textContent=`${state.mode==='share'?'Denominator: '+(state.denominator==='all'?'all filtered entries':'entries reporting this field')+'. ':''}Hover a point for counts and coverage; click it to inspect supporting devices. Multiple categories can overlap. ${fmt(aggregate.unknownYear)} undated ${unitLabel()} are absent from this plot.`;
  el('export-design-series').disabled=!years.length||!selected.size;
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
  for(const category of selected){const points=years.map(year=>({...year,value:value(year,category)}));
   g.append('path').datum(points).attr('class','design-share-line').attr('fill','none').attr('stroke',color(category)).attr('stroke-width',2).attr('d',line().defined(d=>d.value!=null).x(d=>x(d.year)).y(d=>y(d.value)));
   g.selectAll(null).data(points.filter(d=>d.value!=null)).enter().append('circle').attr('class','design-share-point').attr('cx',d=>x(d.year)).attr('cy',d=>y(d.value)).attr('r',3.5).attr('fill',color(category)).attr('tabindex',0).attr('role','button').attr('aria-label',d=>`${pretty(category)}, ${d.year} to ${d.end}: ${d.counts[category]||0} ${unitLabel()}`)
    .on('pointerenter focus',(event,d)=>{tip.innerHTML=`<strong>${esc(pretty(category))}</strong><span>${d.year}${d.end!==d.year?'–'+d.end:''} · ${fmt(d.counts[category]||0)} / ${fmt(d.denominator)} ${unitLabel()}</span><span>${d.denominator?fmt((d.counts[category]||0)/d.denominator*100)+'%':'Share undefined'} · ${fmt(d.reporting)} reporting / ${fmt(d.total)} total</span>`;tip.hidden=false;tip.style.left=Math.max(8,Math.min(width-260,margin.left+x(d.year)+10))+'px';tip.style.top=Math.max(8,margin.top+y(d.value)-70)+'px';})
    .on('pointerleave blur',()=>{tip.hidden=true;}).on('click',(_,d)=>choose(category,d.year)).on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(category,d.year);}});
  }
 }
 function update(resetSeries=false){
  aggregate=aggregateDesigns({devices,papers,index,...state});if(resetSeries||!selected.size)selected=new Set(aggregate.counts.slice(0,6).map(r=>r.category));
  const field=index.fields.find(f=>f.id===state.field);el('design-heading').textContent=field.label;
  el('export-design-breakdown').disabled=!aggregate.counts.length;
  el('design-coverage').innerHTML=[['Filtered '+unitLabel(),aggregate.total],['Reporting this field',aggregate.reporting],['Not reported',aggregate.missing]].map(([label,count])=>`<div><strong>${fmt(count)}</strong><span>${esc(label)}</span></div>`).join('');
  el('design-field-note').textContent=`${fmt(aggregate.indices.length)} extracted device records contribute. ${fmt(aggregate.total?aggregate.reporting/aggregate.total*100:0)}% of ${unitLabel()} report this field. Shares use ${state.denominator==='all'?'all '+unitLabel():'only reporting '+unitLabel()} as the denominator. ${field.kind==='verbatim'?'Categories preserve reported wording; wording variants remain separate.':field.id==='material_family'?'Material names can describe films, barriers or housings. Inspect component labels and reported wording to distinguish their roles.':field.kind==='explicit_mentions'?'Families group explicit names from the reported substrate field.':'Categories follow the extracted classification or explicitly linked process steps.'}`;
  el('design-family-coverage').innerHTML=aggregate.families.map(f=>`<button data-design-family="${esc(f.id)}"><span>${esc(f.label)}</span><span class="design-coverage-track"><i style="width:${f.total?f.count/f.total*100:0}%"></i></span><strong>${fmt(f.total?f.count/f.total*100:0)}%</strong><small>${fmt(f.count)} / ${fmt(f.total)}</small></button>`).join('');
  for(const button of el('design-family-coverage').querySelectorAll('button'))button.onclick=()=>{state.field='design_family';el('design-field').value=state.field;selected=new Set([index.families.find(f=>f.id===button.dataset.designFamily).label]);update();};
  selection=[];onSelect([]);categoriesTable();drawTime();
 }
 let timer;
 for(const key of ['scope','realization','attribution','type','review','search'])el('design-'+key).addEventListener(key==='search'?'input':'change',e=>{state.filters[key]=e.target.value;clearTimeout(timer);timer=setTimeout(()=>update(),key==='search'?150:0);});
 const yearRange=mountYearRange(el('design-year-range'),{nodes:devices,filters:state.filters,inputIds:['design-yearMin','design-yearMax'],onCommit:range=>{Object.assign(state.filters,range);clearTimeout(timer);timer=setTimeout(()=>update(),100);}});
 for(const [id,key,convert] of [['design-field','field',String],['design-unit','unit',String],['design-denominator','denominator',String],['design-bin','bin',Number]])el(id).onchange=e=>{state[key]=convert(e.target.value);if(key==='field'){search='';el('category-search').value='';}limit=30;update(key==='field');};
 el('reset-design-population').onclick=()=>{clearTimeout(timer);state.filters=defaults();yearRange.set(state.filters);for(const key of ['scope','realization','attribution','type','review','search'])el('design-'+key).value=state.filters[key]||'';update();};
 el('category-search').oninput=e=>{search=e.target.value;limit=30;categoriesTable();};el('more-design-categories').onclick=()=>{limit+=40;categoriesTable();};
 el('category-top').onchange=e=>{selected=new Set(aggregate.counts.slice(0,+e.target.value).map(r=>r.category));categoriesTable();drawTime();};
 el('design-value-mode').onchange=e=>{state.mode=e.target.value;drawTime();};
 el('export-design-series').onclick=()=>download(`sqbits-design-${state.field}-over-time.csv`,toCSV(designSeriesCSVRows(aggregate,[...selected])));
 el('export-design-breakdown').onclick=()=>download(`sqbits-design-${state.field}-breakdown.csv`,toCSV(aggregate.counts.map(r=>({...r,unit:state.unit,denominator:aggregate.denominator,denominator_basis:state.denominator,reporting_entries:aggregate.reporting,missing_entries:aggregate.missing,total_entries:aggregate.total,undated_entries:aggregate.unknownYear,field:state.field,population_filters:JSON.stringify(state.filters)}))));
 const observer=new ResizeObserver(()=>drawTime());observer.observe(el('design-time-chart'));
 if(matchMedia('(max-width:720px)').matches)container.querySelector('.filters-panel').open=false;
 // Defer the initial callback until the shared evidence panel has mounted.
 queueMicrotask(()=>{if(!destroyed)update(true);});
 return {get aggregate(){return aggregate;},get selected(){return selection;},selectCategory:choose,clearSelection(){selection=[];onSelect([]);},destroy(){destroyed=true;clearTimeout(timer);yearRange.destroy();observer.disconnect();}};
}
