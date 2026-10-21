import './style.css';
import {load,esc,fmt,pretty,encoding,matchesDevice} from './data.js';
import {auditedRows,auditDevices,auditLabel} from './audit.js';
import {mountTimeline} from './timeline.js';
import {guideHTML,bindGuide} from './guide.js';
import {mountSelectionPanel} from './selection.js';
import {deviceDesignHTML,bindDeviceDesigns,evidenceHTML,observationHTML} from './designs.js';
import {mountYearRange} from './year-range.js';
import {valueScale} from './value-scale.js';
import {colorLegendHTML} from './color-legend.js';
const app=document.querySelector('#app');
const titles={papers:['The literature, connected.','Follow citation links and explore automatically labelled research communities.'],devices:['Find the design connections.','Explore device and component records linked by similarity of reported design choices.'],timeline:['Performance, over time.','Compare one reported outcome at a time, with conditions and source evidence close at hand.'],trends:['How device designs evolve.','Explore categorical design choices, reporting coverage and their shares over publication time.'],guide:['Inside a superconducting qubit.','A visual guide to the structures, materials and processes behind the measurements.']};
let summary,paperData,deviceData,outcomeAudit,graph,chart,designTrends,guideDistributions,yearRange,filterTimer,selectionPanel,selectionVersion=0,networkRenderVersion=null,renderVersion=0,inspectorVersion=0,selectedPoints=[],timelinePoints=[],focusPaper=null,focusDevice=null;
const viewFromHash=location.hash.slice(1);
const networkDefaults=()=>({mode:'2d',running:true,nodeSizeScale:1,edgeWidthScale:1.5,gravity:.001});
const state={view:titles[viewFromHash]?viewFromHash:'papers',metric:'t1',color:'community',colorScale:'auto',log:true,interaction:'lasso',filters:{},networks:{papers:networkDefaults(),devices:networkDefaults()},timelineFilters:{attribution:'own_work',realization:'measured_device',scope:'individual_qubit'},designTrends:{}};
const graphSliders=[
 {id:'edge-width',key:'edgeWidthScale',label:'Edge width',min:.25,max:6,step:.05,hint:'Scale the width of network links.'},
 {id:'node-size',key:'nodeSizeScale',label:'Node size',min:.25,max:4,step:.05,hint:'Scale node sizes while preserving their relative differences.'},
 {id:'gravity',key:'gravity',label:'Gravity',min:-5,max:-1,step:.05,log:true,hint:'Pull toward the center, relative to the default gravity. Higher values make the layout more compact. Resume a paused layout to see the effect.'},
];
const sliderValue=(control,value)=>fmt(control.log?value/.001:value)+'×';
const $=id=>document.getElementById(id);
const option=(value,label,selected)=>`<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(label)}</option>`;
function selectControl(id,label,values,value,all='All'){return `<label class="field">${label}<select id="${id}">${all!==null?option('',all,value):''}${values.map(([v,l])=>option(v,l,value)).join('')}</select></label>`;}
function counts(values,key){const m=new Map();for(const d of values){const v=d[key];m.set(v,(m.get(v)||0)+1);}return [...m].sort((a,b)=>b[1]-a[1]);}
function communityOptions(nodes){const m=new Map();for(const n of nodes){if(!m.has(n.community))m.set(n.community,[n.communityLabel,0]);m.get(n.community)[1]++;}return [...m].sort((a,b)=>b[1][1]-a[1][1]).map(([id,[label,n]])=>[id,`${label} (${fmt(n)})`]);}
function shell(){app.innerHTML=`<header class="site-header"><a class="brand" href="#papers" aria-label="SQbits home"><img src="${import.meta.env.BASE_URL}favicon.svg" alt=""><span>SQbits<span class="brand-dot">.</span></span></a>
 <nav class="view-nav" aria-label="Atlas views">${[['papers','Citation atlas'],['devices','Device designs'],['timeline','Performance'],['trends','Design trends'],['guide','Design guide']].map(([v,label])=>`<button data-view="${v}">${label}</button>`).join('')}</nav><a class="source-link" href="https://github.com/filipinascimento/sqbits" target="_blank" rel="noopener">Source ↗</a></header>
 <main><h1 id="page-title" class="sr-only"></h1><p id="page-subtitle" class="sr-only"></p><section id="workspace"></section></main>
 <footer><details class="dataset-statistics"><summary>Dataset · 21 October 2026</summary><section class="stats-strip" aria-label="Dataset counts"><div><strong>${fmt(summary.papers)}</strong><span>extracted papers</span></div><div><strong>${fmt(summary.devices)}</strong><span>device & component records</span></div><div><strong>${fmt(summary.citationEdges)}</strong><span>indexed citation links</span></div><div><strong>${fmt(summary.reviewPapers)}</strong><span>papers with review flags</span></div></section></details><span><a href="https://heliosweb.io" target="_blank" rel="noopener">Helios</a> · <button class="text-button" data-view="guide">Data & methods</button></span></footer>
 <div id="toast" role="status"></div>`;
 app.addEventListener('click',event=>{const view=event.target.closest('[data-view]');if(view){event.preventDefault();changeView(view.dataset.view);}const device=event.target.closest('[data-device]');if(device)inspectDevice(+device.dataset.device,selectedPoints.find(p=>p.id===device.dataset.point));const paper=event.target.closest('[data-paper]');if(paper)inspectPaper(+paper.dataset.paper);});
 window.addEventListener('hashchange',()=>{const v=location.hash.slice(1);if(titles[v])changeView(v);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')$('close-inspector')?.click();});
}
async function ensureDevices(){if(!deviceData){const [raw,audit]=await Promise.all([load('devices.json.gz'),load('outcome-audit.json.gz')]);if(audit.source_manifest_sha256!==summary.provenance.sourceManifestSha256)throw new Error('Audit/data snapshot mismatch');outcomeAudit=audit;deviceData=auditDevices(raw,audit);}return deviceData;}
async function getDeviceDetail(index){const d=deviceData.nodes[index],p=paperData.nodes[d.paper];const [shard,catalog]=await Promise.all([load(`details/${p.id.slice(0,2)}.json.gz`),load('design-catalog.json')]);if(!shard[d.id])throw new Error('The complete device record could not be found.');return {...shard[d.id],catalog};}
function changeView(view){if(state.view===view)return;state.view=view;state.filters={};state.color='community';history.replaceState(null,'','#'+view);render().catch(showError);}
function showError(error){const holder=$('chart')||$('workspace');if(holder)holder.innerHTML=`<div class="empty-state"><h3>Unable to display this view</h3><p>${esc(error.message)}</p><button id="retry-view">Try again</button></div>`;if($('retry-view'))$('retry-view').onclick=()=>render().catch(showError);console.error(error);}
function loading(text='Loading data…'){return `<div class="loading-state"><div class="spinner"></div><span>${text}</span></div>`;}
async function render(){const version=++renderVersion;networkRenderVersion=null;updateVersion++;inspectorVersion++;selectionVersion++;clearTimeout(filterTimer);yearRange?.destroy();yearRange=null;selectionPanel=null;selectedPoints=[];graph?.destroy();graph=null;chart?.destroy();chart=null;designTrends?.destroy();designTrends=null;guideDistributions?.destroy();guideDistributions=null;
 document.querySelectorAll('.view-nav button').forEach(b=>{b.classList.toggle('active',b.dataset.view===state.view);b.setAttribute('aria-current',b.dataset.view===state.view?'page':'false');});
 document.body.dataset.atlasView=state.view;
 $('page-title').textContent=titles[state.view][0];$('page-subtitle').textContent=titles[state.view][1];
 $('workspace').innerHTML=loading();
 if(state.view==='guide'){
  await ensureDevices();const [auditReport,index,numeric,coverage,estimate,module]=await Promise.all([load('outcome-audit-report.json'),load('design-index.json.gz'),load('design-numeric.json.gz'),load('coverage-report.json'),load('review-estimate.json'),import('./design-distributions.js')]);if(version!==renderVersion)return;
  $('workspace').innerHTML=`<div class="guide-layout"><div class="guide-content">${guideHTML(summary,auditReport)}<section class="coverage-details"><h2>Extraction coverage</h2><p>${fmt(coverage.review.papers)} papers carry extraction review flags (${fmt(coverage.review.flaggedSegments)} PDF segments; ${fmt(coverage.review.recordsInFlaggedSegments)} records). ${fmt(coverage.review.issues.configuration_coverage)} of ${fmt(coverage.review.flags)} flags concern configuration coverage; these are review requests, not confirmed errors.</p><p>Across all ${fmt(coverage.population.records)} device/component records, ${fmt(coverage.fabrication.withSteps)} records in ${fmt(coverage.fabrication.papers.withSteps)} papers have linked fabrication steps. ${fmt(coverage.fabrication.withProcessConditions)} records in ${fmt(coverage.fabrication.papers.withProcessConditions)} papers also have structured process conditions (time, temperature, pressure, chemistry, rate, etc.). Shared recipes count for each applicable record; records are not globally unique devices.</p><h2>Planning a Sol 6.1 review</h2><p>Reviewing the full PDFs and existing extraction for the flagged papers would cover ${fmt(estimate.pdf_pages)} pages in ${fmt(estimate.requests)} requests. Estimated API cost: $195–265 Batch (plan $200–300), or $390–530 Standard (plan $400–600), including 25% contingency. Batch: 24–48 hours, with repairs possibly extending to 72 hours. Standard: approximately 2–6 hours at 50 concurrent requests, subject to account limits. These are scenarios for targeted correction proposals, not full re-extraction. No review has been launched.</p><p>Based on recorded PDF input counts, estimated tokens for the existing records, and 1,000–5,000 output/reasoning tokens per request. <a href="https://developers.openai.com/api/docs/pricing" target="_blank" rel="noopener">OpenAI pricing</a> · <a href="https://developers.openai.com/api/docs/guides/batch" target="_blank" rel="noopener">Batch turnaround</a>.</p></section></div><aside id="selection-panel" class="selection-panel" aria-label="Selected papers and devices"></aside></div>`;
  const selected=indices=>{inspectorVersion++;selectionPanel?.update({view:'devices',deviceIndices:indices});};
  selectionPanel=mountSelectionPanel($('selection-panel'),{papers:paperData.nodes,getDevices:()=>deviceData.nodes,getDeviceDetail,getMetric:()=>null,onClear:()=>selected([]),onExport:()=>{},onBack:()=>{inspectorVersion++;},emptyHint:'Click a design distribution bar to inspect its devices.'});
  const host=document.createElement('section');host.className='guide-distributions';document.querySelector('.topic-tabs').after(host);
  const indices=deviceData.nodes.flatMap((d,i)=>matchesDevice(d,{attribution:'own_work',realization:'measured_device',scope:'individual_qubit'},paperData.nodes)?[i]:[]);
  host.innerHTML='<p class="design-plot-note">Population: own-work, measured individual qubits. Use Design trends to filter years and other populations.</p><div id="guide-distributions"></div>';
  guideDistributions=module.mountDesignDistributions($('guide-distributions'),{devices:deviceData.nodes,papers:paperData.nodes,index,numeric,getPopulation:()=>({indices,unit:'records'}),onSelect:selected});
  bindGuide($('workspace'),i=>guideDistributions.focus([['qubit','circuit'],['materials'],['junction'],['interfaces'],['geometry'],['architecture'],['fabrication'],[]][i]));return;
 }
 if(state.view==='trends'){
  await ensureDevices();const [index,numeric,module]=await Promise.all([load('design-index.json.gz'),load('design-numeric.json.gz'),import('./design-trends.js')]);if(version!==renderVersion)return;
  if(index.source_manifest_sha256!==summary.provenance.sourceManifestSha256||index.records.length!==deviceData.nodes.length||index.records.some((r,i)=>r.id!==deviceData.nodes[i].id))throw new Error('Design trends do not match this device snapshot.');
  designTrends=module.mountDesignTrends($('workspace'),{devices:deviceData.nodes,papers:paperData.nodes,index,numeric,state:state.designTrends,onSelect:indices=>{inspectorVersion++;selectionPanel?.update({view:'devices',deviceIndices:indices});}});
  selectionPanel=mountSelectionPanel($('selection-panel'),{papers:paperData.nodes,getDevices:()=>deviceData.nodes,getDeviceDetail,getMetric:()=>null,onClear:()=>designTrends.clearSelection(),onExport:()=>{},onBack:()=>{inspectorVersion++;},emptyHint:'Choose a design property, then click a distribution bar or time-plot point.'});
  return;
 }
 if(state.view!=='papers')await ensureDevices();if(version!==renderVersion)return;
 const isTimeline=state.view==='timeline',isPaper=state.view==='papers',nodes=isPaper?paperData.nodes:deviceData.nodes,filters=isTimeline?state.timelineFilters:state.filters;
 $('workspace').innerHTML=`<div class="explorer-layout"><details class="filters-panel" open><summary><span>Refine the view</span><span class="filter-icon">☷</span></summary><div class="filter-body">
 <label class="field">Search<input id="search" type="search" placeholder="${isPaper?'Title or DOI…':'Device, paper, material…'}" value="${esc(filters.search||'')}"></label>
 ${isTimeline?selectControl('metric','Reported outcome',summary.metrics.map(m=>[m.id,m.label]),state.metric,null):''}
 ${selectControl('community','Community',communityOptions(nodes),filters.community)}
 ${!isPaper?selectControl('type','Qubit type',counts(nodes,'type').map(([v,n])=>[v,`${pretty(v)} (${fmt(n)})`]),filters.type)+selectControl('scope','Entity scope',counts(nodes,'scope').map(([v,n])=>[v,`${pretty(v)} (${fmt(n)})`]),filters.scope)+selectControl('realization','Realization',counts(nodes,'realization').map(([v,n])=>[v,`${pretty(v)} (${fmt(n)})`]),filters.realization)+selectControl('attribution','Attribution',[['own_work','Own work'],['cited_work','Cited work'],['Unknown','Unknown']],filters.attribution)+selectControl('geometry','Device geometry',counts(nodes,'geometry').map(([v,n])=>[v,`${pretty(v)} (${fmt(n)})`]),filters.geometry)+selectControl('substrate','Reported substrate',counts(nodes,'substrate').slice(0,70).map(([v,n])=>[v,`${v} (${fmt(n)})`]),filters.substrate)+selectControl('material','Reported superconductor',counts(nodes,'material').slice(0,70).map(([v,n])=>[v,`${v} (${fmt(n)})`]),filters.material):''}
 ${selectControl('review','Extraction review',[['clear','No automated flag'],['flagged','Review flagged']],filters.review)}
 <div id="year-range"></div>
 ${selectControl('color','Color by',[['community','Community'],['year','Paper year'],...(isPaper?[['devices','Record count'],['review','Review flag']]:[['type','Qubit type'],['realization','Realization'],['attribution','Attribution'],['scope','Entity scope'],['material','Superconductor'],['substrate','Substrate'],['junction','Junction stack'],['geometry','Geometry'],['t1','Best measured T₁'],['t2_ramsey','Best measured Ramsey T₂*'],['t2_echo','Best measured echo T₂'],...summary.metrics.filter(m=>!['t1','t2_ramsey','t2_echo'].includes(m.id)).map(m=>[m.id,'Measured '+m.label])])],state.color,null)}
 <label class="field" id="color-scale-field" hidden>Color scale<select id="color-scale">${[['auto','Auto · by attribute'],['linear','Linear'],['log','Logarithmic']].map(([v,l])=>option(v,l,state.colorScale)).join('')}</select></label>
 ${!isTimeline?`<label class="check-field"><input id="include-isolates" type="checkbox" ${filters.includeIsolates?'checked':''}>Include entries without network links</label>`:''}
 ${isTimeline?`<label class="check-field"><input id="log-scale" type="checkbox" ${state.log?'checked':''}><span id="log-scale-label">Logarithmic value axis</span></label><label class="check-field"><input id="include-audit-excluded" type="checkbox" ${filters.includeAuditExcluded?'checked':''}>Include excluded or unresolved audit results</label>`:''}
 <button id="reset-filters" class="secondary-button">${isTimeline?'Reset to measured own-work qubits':'Reset filters'}</button>
 <p class="filter-note">${isPaper?'Citing paper → cited paper. Unlinked papers remain in the atlas.':'Records represent individual devices, families and components. Missing design choices are not inferred.'}</p></div></details>
 <div class="visual-column"><section class="visual-panel"><div class="visual-heading"><div><h2 id="visual-count">Loading…</h2></div><div class="visual-actions" id="visual-actions">${isTimeline?`<button id="lasso-mode" class="active" aria-pressed="true">Lasso</button><button id="pan-mode" aria-pressed="false">Pan / zoom</button><button id="clear-selection">Clear</button><button id="fit-view">Reset zoom</button>`:`<button id="fit-view">Fit</button><button id="labels-toggle" class="active" aria-pressed="true">Labels</button><button id="layout-toggle" disabled aria-pressed="true">Pause layout</button>${selectControl('graph-mode','Dimension',[['2d','2D'],['3d','3D']],state.networks[state.view].mode,null)}`}</div></div>
 ${!isTimeline?`<div class="network-controls" role="group" aria-label="Network appearance and layout">${graphSliders.map(c=>{const value=state.networks[state.view][c.key];return `<label class="network-slider" for="${c.id}" title="${esc(c.hint)}"><span>${c.label}<output id="${c.id}-value" for="${c.id}">${sliderValue(c,value)}</output></span><input id="${c.id}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.log?Math.log10(value):value}" aria-valuetext="${sliderValue(c,value)}" disabled></label>`;}).join('')}</div>`:''}
 <div id="chart" class="chart ${isTimeline?'performance-chart':'network-chart'}">${loading('Preparing the visualization…')}</div>
 <div id="legend" class="legend"></div><div class="visual-footnote">${isTimeline?'<span class="line-sample"></span><span id="frontier-label">Observed frontier</span> · PDF audit corrections apply; excluded or unresolved quantities are available using the filter. Hollow points do not set the frontier; dashed outlines denote bounds or unknown form. Wheel to zoom; draw a lasso to select. Shift adds to selection. <span id="scale-explanation"></span> <span class="audit-summary">'+fmt(outcomeAudit.audited_observations)+' observations checked against source PDFs across the dataset.</span>':`${isPaper?'Citation':'Similarity'} links · Drag to navigate, wheel to zoom. Select a node; Shift-click adds more. Hover a community label to highlight its members. Open a card for source details. Labels anchor to the most central visible member by within-community degree (similarity-weighted for devices). Filters preserve the full layout.`}</div>
 </section></div><aside id="selection-panel" class="selection-panel" aria-label="Selected papers and devices"></aside></div>`;
 selectionPanel=mountSelectionPanel($('selection-panel'),{papers:paperData.nodes,getDevices:()=>deviceData?.nodes||[],getDeviceDetail,getMetric:()=>summary.metrics.find(m=>m.id===state.metric),onClear:()=>state.view==='timeline'?chart?.clear():graph?.clearSelection(),onExport:()=>chart?.export(),onBack:()=>{inspectorVersion++;}});
 selectionPanel.update({view:state.view});
 if(matchMedia('(max-width:720px)').matches)document.querySelector('.filters-panel').open=false;
 const apply=()=>{clearTimeout(filterTimer);if(version===renderVersion)updateVisualization().catch(showError);};
 for(const key of ['search','community','type','scope','realization','attribution','material','substrate','geometry','review'])if($(key))$(key).addEventListener(key==='search'?'input':'change',()=>{filters[key]=$(key).value;clearTimeout(filterTimer);filterTimer=setTimeout(apply,key==='search'?300:0);});
 yearRange=mountYearRange($('year-range'),{nodes,filters,onCommit:range=>{Object.assign(filters,range);clearTimeout(filterTimer);filterTimer=setTimeout(apply,100);}});
 const applyColor=()=>{if(isTimeline)apply();else if(graph)renderLegend(graph.setColor(state.color,state.colorScale));};
 $('color').onchange=()=>{state.color=$('color').value;applyColor();};$('color-scale').onchange=()=>{state.colorScale=$('color-scale').value;applyColor();};
 if($('include-isolates'))$('include-isolates').onchange=()=>{filters.includeIsolates=$('include-isolates').checked;apply();};
 $('reset-filters').onclick=()=>{if(isTimeline){state.timelineFilters={attribution:'own_work',realization:'measured_device',scope:'individual_qubit'};render().catch(showError);}else{for(const key of Object.keys(filters))delete filters[key];for(const key of ['search','community','type','scope','realization','attribution','material','substrate','geometry','review'])if($(key))$(key).value='';$('include-isolates').checked=false;yearRange.set(filters);apply();}};
 if(isTimeline){$('include-audit-excluded').onchange=()=>{filters.includeAuditExcluded=$('include-audit-excluded').checked;apply();};$('metric').onchange=()=>{state.metric=$('metric').value;apply();};$('log-scale').onchange=()=>{state.log=$('log-scale').checked;apply();};}
 await updateVisualization();
}
function renderLegend(enc){$('legend').innerHTML=colorLegendHTML(enc);$('legend').classList.toggle('has-colorbar',enc.numeric);if($('color-scale-field')){$('color-scale-field').hidden=!enc.numeric;$('color-scale').querySelector('[value=log]').textContent=enc.controlLabel||'Logarithmic';}}
let updateVersion=0;
function filterNetwork(){const stats=graph.setFilters(state.filters);$('visual-count').textContent=`${fmt(stats.nodeCount)} ${state.view==='papers'?'papers':'records'} · ${fmt(stats.edgeCount)} links`;}
async function updateVisualization(){
 if(state.view==='papers'||state.view==='devices'){
  if(graph){filterNetwork();return;}
  // While the first native engine initializes, collect filter changes in state.
  // Its final setFilters call applies the latest values without mounting twice.
  if(networkRenderVersion===renderVersion)return;networkRenderVersion=renderVersion;
 }
 const version=++updateVersion,view=state.view;graph?.destroy();graph=null;chart?.destroy();chart=null;$('chart').innerHTML=loading('Preparing the visualization…');
 delete $('chart').dataset.engine;inspectorVersion++;selectionVersion++;selectedPoints=[];selectionPanel?.update({view});
 for(const id of ['fit-view','labels-toggle','layout-toggle','graph-mode',...graphSliders.map(c=>c.id)])if($(id)&&view!=='timeline')$(id).disabled=true;
 if(view==='timeline'){
  const metric=summary.metrics.find(m=>m.id===state.metric);const rows=await load(`outcomes/${state.metric}.json.gz`);if(version!==updateVersion||state.view!==view)return;
  timelinePoints=auditedRows(rows,state.metric,outcomeAudit).filter(p=>state.timelineFilters.includeAuditExcluded||(!p.excluded&&!p.quarantined)).filter(p=>matchesDevice(p.attribution?{...deviceData.nodes[p.device],attribution:p.attribution}:deviceData.nodes[p.device],state.timelineFilters,paperData.nodes)).filter(p=>state.timelineFilters.realization!=='measured_device'||p.origin==='measured');
  $('chart').innerHTML='';chart=mountTimeline($('chart'),{points:timelinePoints,metric,devices:deviceData.nodes,papers:paperData.nodes,colorBy:state.color,colorScale:state.colorScale,metrics:summary.metrics,log:state.log,onSelect:()=>{},onSelection:p=>{inspectorVersion++;selectedPoints=p;renderSelectionPanel();}});
  $('log-scale-label').textContent=valueScale(metric,true).controlLabel;$('scale-explanation').textContent=chart.scaleNote;
  $('visual-count').textContent=`${fmt(chart.count)} observations · ${metric.label}`;$('frontier-label').textContent=metric.direction==='envelope'?'Upper envelope (not a performance ranking)':`Observed ${metric.direction==='min'?'lower':'upper'} frontier · ${chart.frontierCount} improvements`;
  renderLegend(chart.encoding);selectedPoints=[];state.interaction='lasso';chart.setMode('lasso');
  for(const mode of ['lasso','pan'])$(mode+'-mode').onclick=()=>{state.interaction=mode;chart.setMode(mode);for(const m of ['lasso','pan']){$(m+'-mode').classList.toggle('active',m===mode);$(m+'-mode').setAttribute('aria-pressed',String(m===mode));}};
  $('clear-selection').onclick=()=>chart.clear();$('fit-view').onclick=()=>chart.reset();renderSelectionPanel();
 }else if(view==='papers'||view==='devices'){
  const isPaper=view==='papers',data=isPaper?paperData:deviceData,filters=state.filters;
  const indexed=data.nodes.map((n,i)=>({...n,_index:i}));
  const edges=data.edges.map(e=>({source:data.nodes[e[0]].id,target:data.nodes[e[1]].id,weight:e[2]}));
  $('chart').innerHTML='';renderLegend(encoding(indexed,state.color,{metrics:summary.metrics,mode:state.colorScale}));
  const {mountGraph}=await import('./graph.js');if(version!==updateVersion||state.view!==view)return;
  const networkState=state.networks[view];
  const syncControls=({running,mode})=>{
   if(version!==updateVersion||state.view!==view)return;
   networkState.mode=mode;
   const toggle=$('layout-toggle');toggle.textContent=running?'Pause layout':'Resume layout';toggle.classList.toggle('active',running);toggle.setAttribute('aria-pressed',String(running));$('graph-mode').value=mode;
  };
  const mounted=await mountGraph($('chart'),{nodes:indexed,edges,directed:isPaper,filters,papers:paperData.nodes,colorBy:state.color,colorScale:state.colorScale,metrics:summary.metrics,...networkState,onLayoutState:syncControls,onSelection:async nodes=>{const ticket=++selectionVersion;inspectorVersion++;if(isPaper&&nodes.length)await ensureDevices();if(ticket!==selectionVersion||version!==updateVersion||state.view!==view)return;selectionPanel.update({view,paperIndices:isPaper?nodes.map(n=>n._index):[],deviceIndices:isPaper?[]:nodes.map(n=>n._index)});},onEdge:e=>inspectEdge(e,isPaper)});
  if(version!==updateVersion||state.view!==view){mounted?.destroy();return;}graph=mounted;if(!graph)return;filterNetwork();renderLegend(graph.setColor(state.color,state.colorScale));
  $('chart').dataset.engine='helios';for(const id of ['fit-view','labels-toggle','layout-toggle','graph-mode'])$(id).disabled=false;
  for(const control of graphSliders){
   const input=$(control.id);input.disabled=false;
   input.oninput=()=>{
    const value=control.log?10**Number(input.value):Number(input.value);networkState[control.key]=value;
    const text=sliderValue(control,value);$(control.id+'-value').textContent=text;input.setAttribute('aria-valuetext',text);
    Promise.resolve(mounted[control.key](value)).catch(error=>{if(version===updateVersion&&state.view===view){toast('Unable to update the network setting.');console.error(error);}});
   };
  }
  $('fit-view').onclick=()=>graph.fit();let labels=true;
  $('labels-toggle').onclick=()=>{labels=!labels;graph.labels(labels);$('labels-toggle').classList.toggle('active',labels);$('labels-toggle').setAttribute('aria-pressed',String(labels));};
  const layoutButton=$('layout-toggle'),modeSelect=$('graph-mode');layoutButton.disabled=false;
  const layoutAction=async action=>{
   layoutButton.disabled=true;modeSelect.disabled=true;
   try{await action();}catch(error){if(version===updateVersion&&state.view===view){toast('Unable to update the layout. Try again.');console.error(error);}}
   finally{if(version===updateVersion&&state.view===view){layoutButton.disabled=false;modeSelect.disabled=false;syncControls({running:mounted.running,mode:mounted.helios.mode()});}}
  };
  layoutButton.onclick=()=>layoutAction(async()=>{networkState.running=await mounted.toggleLayout();});
  modeSelect.onchange=()=>{const mode=modeSelect.value;networkState.mode=mode;return layoutAction(()=>mounted.mode(mode));};
  if(isPaper&&focusPaper!=null){graph.select(paperData.nodes[focusPaper]);focusPaper=null;}if(!isPaper&&focusDevice!=null){graph.select(deviceData.nodes[focusDevice]);focusDevice=null;}
 }
}
function renderSelectionPanel(){selectionPanel?.update({view:'timeline',points:selectedPoints});}
function openInspector(){selectionPanel?.openDetails();$('inspector-content').innerHTML=loading('Loading source evidence…');return ++inspectorVersion;}

async function inspectPaper(index){const ticket=openInspector(),p=paperData.nodes[index];await ensureDevices();if(ticket!==inspectorVersion)return;const rows=deviceData.nodes.map((d,i)=>[d,i]).filter(([d])=>d.paper===index);
 $('inspector-content').innerHTML=`<div class="eyebrow">SOURCE PAPER · ${esc(p.year||'YEAR UNKNOWN')}</div><h2>${esc(p.label)}</h2><div class="tag-row"><span>${esc(p.communityLabel)}</span>${p.review?'<span class="review-badge">Review flagged</span>':''}</div><p>${fmt(p.degree)} indexed citation links · ${fmt(rows.length)} extracted entity records${p.segmented?' · PDF processed in page segments':''}.</p>${sourceLink(p)}<h3>Devices & components</h3>${rows.slice(0,100).map(([d,i])=>`<button class="inspector-entry" data-device="${i}"><strong>${esc(d.label)}</strong><small>${esc(pretty(d.scope))} · ${esc(pretty(d.realization))} · ${esc(pretty(d.attribution))}</small></button>`).join('')||'<p>No device records were extracted from this paper.</p>'}${rows.length>100?'<p>First 100 records shown; filter the device network by this paper’s title to explore all records.</p>':''}<h3>Reading the source</h3><p class="muted">Paper year comes from the frozen work manifest. Cited records and proposed or simulated entities are labelled separately; a record is not automatically a measured qubit.</p>`;
}
function sourceLink(p){return p.url?`<a class="paper-link" href="${esc(p.url)}" target="_blank" rel="noopener">Open original paper ↗</a>`:'<p class="muted">No external paper link is available.</p>';}
function auditHTML(device){const findings=Object.values(outcomeAudit?.findings||{}).filter(f=>f.device_id===device.id);if(!findings.length)return '';return `<h3>Source PDF audit <small>${findings.length}</small></h3><p>Corrections apply to the plotted data. Original extraction and evidence remain below.</p>${findings.map(f=>`<details class="audit-finding" ${f.action!=='confirm'?'open':''}><summary>${f.target_metric?'Reclassified':esc(auditLabel(f.action))} · ${esc(summary.metrics.find(m=>m.id===f.metric)?.label||f.metric)}${f.target_metric?' → '+esc(summary.metrics.find(m=>m.id===f.target_metric)?.label||f.target_metric):''}<span>${fmt(f.original_value)} ${esc(f.unit)}${f.action==='correct'?' → '+fmt(f.value)+' '+esc(f.unit):''}</span></summary><p>${esc(f.reason)}</p>${f.frontier_eligible===false?'<p>This protocol does not set the standard frontier.</p>':''}<blockquote><span>Source PDF p. ${f.page??'unknown'}</span>${esc(f.quote)}</blockquote></details>`).join('')}`;}
async function inspectDevice(index,point){const ticket=openInspector(),d=deviceData.nodes[index],p=paperData.nodes[d.paper];try{const detail=await getDeviceDetail(index);if(ticket!==inspectorVersion)return;const r=detail.record,start=detail.source_page_start;
 $('inspector-content').innerHTML=`<div class="eyebrow">${esc(pretty(r.entity_scope))} · ${esc(p.year||'YEAR UNKNOWN')}</div><h2>${esc(r.reported_device_name)}</h2><div class="tag-row"><span>${esc(pretty(r.qubit_type))}</span><span>${esc(pretty(r.realization))}</span><span>${esc(pretty(r.attribution))}</span>${d.review?'<span class="review-badge">Review flagged</span>':''}</div><button class="table-link paper-title" data-paper="${d.paper}">${esc(p.label)}</button>${sourceLink(p)}
 <div class="inspector-actions"><button id="locate-device">Show in device network ↗</button><button id="locate-paper">Show citation context ↗</button></div>
 ${point?`<div class="selected-value"><span>${esc(point.name)}</span><strong>${fmt(point.value)} ${esc(summary.metrics.find(m=>m.id===state.metric)?.unit||'')}</strong><small>Reported: ${esc(point.text)}</small>${point.audit?`<small>PDF audit: ${esc(auditLabel(point.audit.action))}${point.rawValue!==point.value?` · originally ${fmt(point.rawValue)} ${esc(summary.metrics.find(m=>m.id===state.metric)?.unit||'')}`:''}</small>`:''}</div>`:''}
 <dl><dt>Original type</dt><dd>${esc(r.qubit_type_reported||'Not reported')}</dd><dt>Variant</dt><dd>${esc(r.subtype_reported||'Not reported')}</dd><dt>Geometry</dt><dd>${esc(pretty(r.geometry))}</dd><dt>Source device ID</dt><dd>${esc(r.device_id)}</dd>${r.citation?`<dt>Citation</dt><dd>${esc(r.citation)}</dd>`:''}</dl>
 <h3>All design choices & fabrication</h3>${deviceDesignHTML(detail)}
 ${auditHTML(d)}<h3>Original reported outcomes <small>${r.outcomes.length}</small></h3>${r.outcomes.map(o=>observationHTML(o,start)).join('')||'<p class="muted">No outcomes reported for this record.</p>'}
 ${r.configurations.length?`<h3>Measurement configurations</h3>${r.configurations.map(c=>`<details><summary>${esc(c.reported_label)}</summary><p>${esc(c.description)}</p>${evidenceHTML(c.evidence,start)}</details>`).join('')}`:''}
 ${detail.review_flags.length?`<h3>Review flags</h3><ul class="review-list">${detail.review_flags.map(f=>`<li>${esc(pretty(f.issue))}${f.detail?': '+esc(f.detail):''}</li>`).join('')}</ul>`:''}
 ${detail.document_notes.length?`<details class="document-notes"><summary>Source and extraction notes</summary>${detail.document_notes.map(n=>`<p>${esc(n)}</p>`).join('')}</details>`:''}
 <details><summary>Identity evidence</summary>${evidenceHTML(r.identity_evidence,start)}</details>`;
 bindDeviceDesigns($('inspector-content'),detail);
 $('locate-paper').onclick=async()=>{focusPaper=d.paper;state.view='papers';state.filters={};history.replaceState(null,'','#papers');await render();};
 $('locate-device').onclick=async()=>{focusDevice=index;state.view='devices';state.filters={};history.replaceState(null,'','#devices');await render();};
 }catch(error){if(ticket===inspectorVersion)$('inspector-content').innerHTML=`<h2>Evidence could not be loaded</h2><p>${esc(error.message)}</p>`;}}
function inspectEdge(edge,isPaper){const nodes=isPaper?paperData.nodes:deviceData.nodes,a=nodes.find(n=>n.id===edge.source),b=nodes.find(n=>n.id===edge.target);openInspector();const shared=isPaper?[]:a.features.filter(f=>b.features.includes(f));$('inspector-content').innerHTML=`<div class="eyebrow">${isPaper?'DIRECTED CITATION':'DESIGN SIMILARITY'}</div><h2>${esc(a.label)}</h2><p>${isPaper?'cites':'shares reported design features with'}</p><h3>${esc(b.label)}</h3>${!isPaper?`<p>IDF-weighted Jaccard similarity: <strong>${fmt(edge.weight)}</strong></p><h3>Shared fingerprint features</h3><ul>${shared.map(f=>`<li>${esc(pretty(f))}</li>`).join('')}</ul><p class="muted">Numeric bins group reported canonical design values by one-third of a decade. A similarity link is not a fabrication lineage or citation.</p>`:''}`;}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),4500);}
try{summary=await load('summary.json');paperData=await load('papers.json.gz');shell();await render();window.sqbits={state,get graph(){return graph;},get chart(){return chart;},get trends(){return designTrends;},get devices(){return deviceData;},papers:paperData,inspectDevice,inspectPaper};}catch(error){app.innerHTML=`<div class="boot"><h1>SQbits</h1><p>${esc(error.message)}</p><button onclick="location.reload()">Reload</button></div>`;console.error(error);}
