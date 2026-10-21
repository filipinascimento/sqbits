import {esc,fmt,pretty} from './data.js';

// Group record IDs rather than names: two devices named Q1 stay distinct.
export function groupSelection({paperIndices=[],deviceIndices=[],points=[],papers,devices}){
 const groups=new Map(),wanted=new Set(deviceIndices),observations=new Map();
 const paperGroup=index=>{if(!groups.has(index))groups.set(index,{index,paper:papers[index],devices:[]});return groups.get(index);};
 for(const index of paperIndices)paperGroup(index);
 const wholePapers=new Set(paperIndices);
 if(wholePapers.size)devices.forEach((device,index)=>{if(wholePapers.has(device.paper))wanted.add(index);});
 for(const point of points){wanted.add(point.device);if(!observations.has(point.device))observations.set(point.device,[]);observations.get(point.device).push(point);}
 for(const index of wanted){const device=devices[index];if(device)paperGroup(device.paper).devices.push({index,device,points:observations.get(index)||[]});}
 return [...groups.values()].sort((a,b)=>(b.paper.year||0)-(a.paper.year||0)||a.paper.label.localeCompare(b.paper.label));
}

export function mountSelectionPanel(container,{getDevices,papers,getMetric,onClear,onExport,onBack}){
 let groups=[],limit=20,mode='timeline',pointCount=0,recordCount=0;
 const deviceLimits=new Map();
 container.innerHTML=`<div class="selection-heading"><div><span class="eyebrow">SELECTED EVIDENCE</span><h3>Selected papers & devices</h3></div><button id="clear-panel-selection" aria-label="Clear selected papers and devices">Clear</button></div>
 <div class="selection-summary" role="status"><strong id="selection-count"></strong><span id="selection-totals"></span></div>
 <div class="selection-tools"><button id="export-selection" class="secondary-button">Download CSV ↓</button></div>
 <div id="selection-list" class="selection-list"></div>
 <section id="inspector" aria-label="Source details"><button id="close-inspector">← Back to selection</button><div id="inspector-content"></div></section>`;
 const el=id=>container.querySelector('#'+id);
 el('clear-panel-selection').onclick=()=>onClear();
 el('export-selection').onclick=()=>onExport();
 el('close-inspector').onclick=()=>{closeDetails();onBack();};
 function closeDetails(){container.classList.remove('showing-details');el('inspector').classList.remove('open');}
 function deviceHTML({index,device,points}){
  const metric=getMetric();
  const values=points.map(p=>`<div class="selection-value"><strong>${fmt(p.value)} ${esc(metric?.unit||'')}</strong><span>${esc(p.text)}</span><small>${esc(pretty(p.origin))}${p.conditions?' · '+esc(p.conditions):''}</small></div>`);
  return `<article class="selected-device" data-device-index="${index}"><button class="selected-device-title" data-device="${index}"${points[0]?` data-point="${esc(points[0].id)}"`:''}>${esc(device.label)} <span aria-hidden="true">↗</span></button>
   <div class="selected-device-meta">${esc(pretty(device.type))} · ${esc(pretty(device.scope))}<br>${esc(pretty(device.realization))} · ${esc(pretty(device.attribution))}</div>
   ${device.review?'<span class="review-badge">Review flagged</span>':''}
   ${values.slice(0,3).join('')}${values.length>3?`<details class="more-values"><summary>${fmt(values.length-3)} more selected observations</summary>${values.slice(3).join('')}</details>`:''}</article>`;
 }
 function render(){
  const count=mode==='timeline'?pointCount:mode==='papers'?groups.length:recordCount;
  const noun=mode==='timeline'?(count===1?'observation':'observations'):mode==='papers'?(count===1?'paper':'papers'):(count===1?'device record':'device records');
  el('selection-count').textContent=count?`${fmt(count)} ${noun} selected`:'No entries selected';
  el('selection-totals').textContent=count?`${fmt(groups.length)} ${groups.length===1?'paper':'papers'} · ${fmt(recordCount)} device ${recordCount===1?'record':'records'}`:mode==='timeline'?'Click a point or draw a lasso to build your selection.':'Click a node to select it. Shift-click to add more.';
  el('clear-panel-selection').disabled=!count;
  el('export-selection').parentElement.hidden=mode!=='timeline';el('export-selection').textContent=pointCount?'Export selection CSV ↓':'Export filtered data CSV ↓';
  el('selection-list').innerHTML=groups.length?groups.slice(0,limit).map(g=>{
   const shown=deviceLimits.get(g.index)||5;
   return `<section class="selected-paper" data-paper-index="${g.index}"><div class="selected-paper-meta">${esc(g.paper.year||'Year unknown')} · ${fmt(g.devices.length)} device ${g.devices.length===1?'record':'records'}</div>
    <h4><button data-paper="${g.index}">${esc(g.paper.label)}</button></h4>
    ${g.paper.url?`<a class="selection-source" href="${esc(g.paper.url)}" target="_blank" rel="noopener">Original paper ↗</a>`:''}
    ${g.devices.slice(0,shown).map(deviceHTML).join('')}
    ${g.devices.length>shown?`<button class="selection-more" data-more-devices="${g.index}">Show more devices (${fmt(g.devices.length-shown)} remaining)</button>`:''}</section>`;
  }).join('')+(groups.length>limit?`<button class="selection-more" id="more-selected-papers">Show more papers (${fmt(groups.length-limit)} remaining)</button>`:''):'<div class="selection-empty"><span aria-hidden="true">↖</span><p>Your selected papers and devices will appear here.</p><small>Open a paper or device card to inspect its source evidence and design choices.</small></div>';
  container.querySelectorAll('[data-more-devices]').forEach(button=>button.onclick=()=>{const index=+button.dataset.moreDevices;deviceLimits.set(index,(deviceLimits.get(index)||5)+10);render();});
  if(el('more-selected-papers'))el('more-selected-papers').onclick=()=>{limit+=20;render();};
 }
 const controller={
  update({points=[],paperIndices=[],deviceIndices=[],view='timeline'}={}){
   mode=view;pointCount=points.length;limit=20;deviceLimits.clear();closeDetails();
   groups=groupSelection({points,paperIndices,deviceIndices,papers,devices:getDevices()});
   recordCount=groups.reduce((total,g)=>total+g.devices.length,0);render();el('selection-list').scrollTop=0;
  },
  openDetails(){container.classList.add('showing-details');el('inspector').classList.add('open');el('inspector').scrollTop=0;},
  closeDetails,
 };
 controller.update();return controller;
}
