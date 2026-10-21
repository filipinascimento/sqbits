import {esc,fmt,pretty,download} from './data.js';

export function evidenceHTML(evidence,start=1){return (evidence||[]).map(e=>`<blockquote><span>PDF p. ${e.pdf_page+start-1}${e.locator?' · '+esc(e.locator):''}</span>${esc(e.quote)}</blockquote>`).join('');}
export function observationHTML(o,start=1){const q=o.quantity,n=o.normalized;return `<details class="observation"><summary><span>${esc(o.reported_name)}</span><strong>${esc(o.reported_text||q?.text)}</strong></summary><dl><dt>Property</dt><dd>${esc(pretty(o.property_name))}</dd><dt>Origin</dt><dd>${esc(pretty(o.origin))}</dd>${o.configuration_id?`<dt>Configuration</dt><dd>${esc(o.configuration_id)}</dd>`:''}${o.component?`<dt>Component</dt><dd>${esc(o.component)}</dd>`:''}${o.conditions?`<dt>Conditions</dt><dd>${esc(o.conditions)}</dd>`:''}${q?`<dt>Reported quantity</dt><dd>${esc(q.text)} · ${esc(pretty(q.nature))}${q.uncertainty_definition?' · '+esc(q.uncertainty_definition):''}</dd>`:''}${n?`<dt>Normalization</dt><dd>${n.value!=null?fmt(n.value)+' '+esc(n.unit||'')+' · ':''}${esc(n.status)}<br>${esc(n.note)}</dd>`:''}</dl>${evidenceHTML(o.evidence,start)}</details>`;}
export function groupDesignChoices(choices,catalog){
 const groups=new Map(catalog.families.map(f=>[f.id,{...f,choices:[]} ]));
 for(const choice of choices){const family=catalog.properties[choice.property_name]?.family||'design';(groups.get(family)||groups.get('design')).choices.push(choice);}
 return [...groups.values()].filter(g=>g.choices.length);
}
const searchText=value=>esc(JSON.stringify(value).toLowerCase());
export function deviceDesignHTML(detail){
 const {record:r,catalog}=detail,start=detail.source_page_start,steps=detail.fabrication_processes.flatMap(f=>f.steps);
 return `<div class="device-design-content" data-design-record="${esc(r.device_id)}" data-design-count="${r.design_choices.length}" data-step-count="${steps.length}">
 <dl class="design-identity"><dt>Reported type</dt><dd>${esc(r.qubit_type_reported||pretty(r.qubit_type))}</dd><dt>Named variant</dt><dd>${esc(r.subtype_reported||'Not reported')}</dd><dt>Geometry</dt><dd>${esc(pretty(r.geometry))}</dd></dl>
 <div class="design-detail-tools"><label>Search design choices & process steps<input type="search" class="design-detail-search" placeholder="Material, junction, cleaning, E_J…" aria-label="Search design choices and fabrication steps"></label><button class="download-device-record">Download full record JSON ↓</button></div>
 <p class="design-detail-count" role="status">${fmt(r.design_choices.length)} reported design choices · ${fmt(steps.length)} fabrication steps</p>
 ${groupDesignChoices(r.design_choices,catalog).map(g=>`<section class="design-family"><h4>${esc(g.label)} <small>${g.choices.length}</small></h4>${g.choices.map(o=>`<div class="design-search-item" data-search="${searchText(o)}">${observationHTML(o,start)}</div>`).join('')}</section>`).join('')||'<p>No design choices were extracted for this record.</p>'}
 <section class="design-family fabrication-details"><h4>Fabrication recipes <small>${detail.fabrication_processes.length}</small></h4>${detail.fabrication_processes.map(f=>`<article class="design-recipe"><h5>${esc(f.process_id)} · ${esc(pretty(f.scope))}</h5><p>${esc(f.description)}</p><p class="muted">Step numbers appear only when the source reports an order.</p>${f.steps.map(s=>`<div class="recipe-step design-search-item" data-search="${searchText([f.description,s])}"><span class="step-order">${s.reported_order??'—'}</span><div><h5>${esc(pretty(s.operation))}</h5><p>${esc(s.description)}</p>${s.parameters.map(o=>observationHTML(o,start)).join('')}${evidenceHTML(s.evidence,start)}</div></div>`).join('')}</article>`).join('')||'<p>No explicitly applicable fabrication recipe was extracted.</p>'}</section>
 </div>`;
}
export function bindDeviceDesigns(root,detail){
 const content=root.querySelector('.device-design-content');if(!content)return;
 const items=[...content.querySelectorAll('.design-search-item')],counter=content.querySelector('.design-detail-count'),original=counter.textContent;
 content.querySelector('.design-detail-search').oninput=e=>{const query=e.target.value.trim().toLowerCase();for(const item of items)item.hidden=!!query&&!item.dataset.search.includes(query);for(const group of content.querySelectorAll('.design-family'))group.hidden=!!query&&![...group.querySelectorAll('.design-search-item')].some(e=>!e.hidden);counter.textContent=query?`${items.filter(e=>!e.hidden).length} matching design choices / process steps`:original;};
 content.querySelector('.download-device-record').onclick=()=>{const {catalog,...raw}=detail;download('sqbits-'+detail.record.device_id.replace(/[^\w.-]+/g,'_')+'.json',JSON.stringify(raw,null,2),'application/json');};
}
