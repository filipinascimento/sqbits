import HeliosNetwork,{AttributeType} from 'helios-network';
import {Helios,EVENTS} from '../node_modules/helios-web/src/index.js';
import {encoding,numeric,pretty,esc,fmt} from './data.js';
import {networkFilterRules,communityRanks} from './network-model.js';

export async function mountGraph(container,{nodes,edges,directed,colorBy,filters={},papers=[],onSelection,onEdge,mode='2d',running=true,nodeSizeScale=1,edgeWidthScale=1.5,gravity=.001,onLayoutState}){
 const network=await HeliosNetwork.create({directed,initialEdges:Math.max(1,edges.length)});
 if(!container.isConnected){network.dispose();return null;}
 const handles=network.addNodes(nodes.length),lookup=new Map(nodes.map((n,i)=>[n.id,Number(handles[i])])),byIndex=new Map(nodes.map((n,i)=>[Number(handles[i]),n]));
 const edgeHandles=network.addEdges(edges.map(e=>[lookup.get(e.source),lookup.get(e.target)]));
 const ranks=communityRanks(nodes,edges,directed),representatives=new Map([...ranks].map(([c,group])=>[c,group[0].node]));
 let activeIds=new Set(byIndex.keys());
 const communityNodes=new Map();for(const [id,n] of byIndex){if(!communityNodes.has(n.community))communityNodes.set(n.community,[]);communityNodes.get(n.community).push(id);}
 network.nodeAttribute('label',(_,id,i)=>representatives.get(nodes[i].community)===nodes[i]?nodes[i].communityLabel:'')
  .nodeAttribute('score',(_,id,i)=>Math.log1p(nodes[i].degree),{type:AttributeType.Float});
 for(const key of ['community','type','scope','realization','attribution','material','substrate','geometry'])network.nodeAttribute('sq_'+key,(_,id,i)=>String(nodes[i][key]??''),{type:AttributeType.String});
 network.nodeAttribute('sq_review',(_,id,i)=>nodes[i].review?'flagged':'clear',{type:AttributeType.String})
  .nodeAttribute('sq_year',(_,id,i)=>nodes[i].year??NaN,{type:AttributeType.Float})
  .nodeAttribute('sq_degree',(_,id,i)=>nodes[i].degree,{type:AttributeType.Float})
  .nodeAttribute('sq_search',(_,id,i)=>{const n=nodes[i];return (directed?[n.label,n.doi]:[n.label,n.type,n.material,n.substrate,n.junction,n.geometry,papers[n.paper]?.label]).join(' ').toLowerCase();},{type:AttributeType.String});
 let helios;
 try{
  // Helios owns initialization, forces, positions and dimensional transitions.
  // In particular, do not replace the engine when resuming a paused layout.
  // Cool in about 342 force steps rather than the default 2,300. Apply this
  // to the native engine so it also governs reheats and dimension changes.
  helios=new Helios(network,{container,mode,layout:{type:'gpu-force',options:{alphaDecay:.02}},storage:false,session:false,fileDrop:false,ui:false,quickControls:false,autoCleanup:false,disposeNetworkOnDestroy:true,
   density:false,legends:false,edgeFastRendering:false,edgeAdaptiveQuality:{enabled:false},interactionRenderOrder:true,
   behaviors:{layout:{running,parameters:{kGravity:gravity}},
    labels:{enabled:true,source:'label',selectionMode:'ranked',maxVisible:28,maxChars:44,minScreenRadiusPx:0,fontSizeScale:.95,outlineWidth:4,fill:'#22413d',outlineColor:'#f8f8f3'},
    // Match community emphasis through native transient shader hover, without
    // rewriting state buffers or disturbing the evidence selection.
    hover:{nodeHover:true,hoverLabel:false,hoverConnectedEdges:true,highlightConnectedEdges:true,hoverAffectsOtherElements:true,hoverStyleFromHighlight:true},appearance:{background:'#f4f6f2',shadedEnabled:false,shadedNodes:false,shadedEdges:false}}});
  await helios.ready;
  if(!container.isConnected){helios.destroy();return null;}
  helios.behavior.labels.update({enabled:true,source:id=>{const n=byIndex.get(id);return n&&representatives.get(n.community)===n?n.communityLabel:null;},selectionMode:'ranked',pinnedNodes:[...representatives.values()].map(n=>lookup.get(n.id)),maxVisible:28,minScreenRadiusPx:0,maxChars:44,fontSizeScale:.95,outlineWidth:4,fill:'#22413d',outlineColor:'#f8f8f3'});
  helios.behavior.mappers.setChannelConfig('node','size',{type:'linear',attributes:'score',domain:[0,Math.max(1,...nodes.map(n=>Math.log1p(n.degree)))],range:[1.5,7]});
  helios.behavior.mappers.setChannelConfig('node','opacity',{type:'constant',value:.92});
  // Keep Helios's default edge mapper: width 1, with endpoint colors derived
  // from the live node-color mapper and interpolated along each edge.
  helios.nodeSizeScale(nodeSizeScale);helios.edgeWidthScale(edgeWidthScale);
  helios.semanticZoomExponent(.65);
 }catch(error){helios?.destroy();if(!helios)network.dispose();throw error;}
 const tip=document.createElement('div');tip.className='graph-tooltip';tip.hidden=true;container.append(tip);
 let highlightedCommunity=null;
 function highlightCommunity(community){
  if(community===highlightedCommunity)return;
  highlightedCommunity=community;tip.hidden=true;
  // Use the same source-managed HIGHLIGHTED state path as native Helios
  // legend hover. This preserves selection and lets Helios dim other items.
  if(community==null)helios._clearHighlightSource('sqbits:community-label');
  else helios._setHighlightSource('sqbits:community-label',{nodes:(communityNodes.get(community)||[]).filter(id=>activeIds.has(id))});
 }
 const labelAt=target=>target?.closest?.('.helios-label[data-node-id]');
 const labelEnter=e=>{const label=labelAt(e.target);if(!label||label===labelAt(e.relatedTarget))return;const n=byIndex.get(Number(label.dataset.nodeId));if(n)highlightCommunity(n.community);};
 const labelLeave=e=>{const label=labelAt(e.target);if(label&&label!==labelAt(e.relatedTarget))highlightCommunity(null);};
 const clearHighlight=()=>highlightCommunity(null);
 container.addEventListener('pointerover',labelEnter);container.addEventListener('pointerout',labelLeave);container.addEventListener('pointerleave',clearHighlight);
 const edgeByIndex=new Map(Array.from(edgeHandles,(id,i)=>[Number(id),edges[i]]));
 helios.on(EVENTS.EDGE_CLICK,e=>{const edge=edgeByIndex.get(e.detail?.index);queueMicrotask(()=>{if(!disposed&&edge)onEdge?.(edge);});});
 helios.on(EVENTS.NODE_HOVER,e=>{const d=e.detail||{},n=byIndex.get(d.index);if(d.state==='out'||!n||highlightedCommunity!=null){tip.hidden=true;return;}tip.innerHTML=`<strong>${esc(n.label)}</strong><span>${esc(n.year||'Year unknown')} · ${esc(n.communityLabel)}<br>${fmt(n.degree)} connections${n.review?' · Review flagged':''}</span>`;tip.hidden=false;const r=container.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(r.width-300,d.clientX-r.left+14))+'px';tip.style.top=Math.max(8,Math.min(r.height-130,d.clientY-r.top+14))+'px';});
 let disposed=false,transitioning=false,pending=Promise.resolve();
 let selectionQueued=false,selectionKey='';
 helios.behavior.selection.on('change',()=>{
  if(selectionQueued||disposed)return;selectionQueued=true;
  queueMicrotask(()=>{
   selectionQueued=false;if(disposed)return;
   const ids=[...helios.behavior.selection.getPublicState().selectedNodes].sort((a,b)=>a-b),key=ids.join(',');
   if(key===selectionKey)return;selectionKey=key;onSelection?.(ids.map(id=>byIndex.get(id)).filter(Boolean));
  });
 });
 // Helios reports a naturally cooled layout as idle, distinct from running.
 const isRunning=()=>helios.behavior.layout.runState()==='running';
 const notify=()=>{if(!disposed&&!transitioning)onLayoutState?.({running:isRunning(),mode:helios.mode()});};
 helios.on(EVENTS.LAYOUT_START,notify);helios.on(EVENTS.LAYOUT_STOP,notify);
 // Serialize layout/camera operations, including calls made while controls are
 // busy. Deferring destruction lets an in-flight GPU readback finish safely.
 const perform=action=>{const result=pending.then(()=>{if(!disposed)return action();});pending=result.catch(()=>{});return result;};
 const controller={
  helios,
  get representatives(){return [...representatives].map(([community,node])=>({community,id:node.id,centrality:ranks.get(community).find(r=>r.node===node).strength}));},
  setFilters(next){
   clearHighlight();tip.hidden=true;
   // Render scope preserves the full layout topology, positions and engine.
   // Helios owns node/edge selectors, picking, labels and rendering masks.
   helios.behavior.filters.replaceRules({scope:'render',nodeRules:networkFilterRules(next)});
   const stats=helios.getGraphFilter();if(stats.error)throw new Error(stats.error);
   activeIds=network.withBufferAccess(()=>new Set(helios._getRenderNetwork().nodeIndices));
   representatives.clear();for(const [community,group] of ranks){const first=group.find(r=>activeIds.has(lookup.get(r.node.id)));if(first)representatives.set(community,first.node);}
   helios.behavior.labels.update({pinnedNodes:[...representatives.values()].map(n=>lookup.get(n.id))});
   helios.labels().requestFullReselect?.('atlas-filter');
   return stats;
  },
  get running(){return !disposed&&isRunning();},
  setColor(key){const enc=encoding(nodes,key);if(enc.numeric){network.nodeAttribute('node_color',(_,id,i)=>Number.isFinite(numeric(nodes[i],key))?numeric(nodes[i],key):NaN,{type:AttributeType.Float});const values=nodes.map(n=>numeric(n,key)).filter(Number.isFinite);const lo=values.length?Math.min(...values):0,hi=values.length?Math.max(...values):1;helios.behavior.mappers.setChannelConfig('node','color',{type:'colormap',attributes:'node_color',colormap:'interpolateViridis',domain:[lo,hi===lo?lo+1:hi],defaultValue:'#a4ada9'});}
   else{const index=new Map(enc.domain.map((v,i)=>[v,i]));network.nodeAttribute('category_color',(_,id,i)=>index.get(enc.get(nodes[i])),{type:AttributeType.Category});network.setNodeAttributeCategoryDictionary('category_color',enc.domain.map((v,i)=>({id:i,label:pretty(v)})),{remapExisting:false});helios.behavior.mappers.setChannelConfig('node','color',{type:'categorical',attributes:'category_color',domain:enc.domain.map((_,i)=>i),range:enc.domain.map(v=>enc.color(nodes.find(n=>enc.get(n)===v))),defaultValue:'#a4ada9'});}
   helios.behavior.legends.enabled(false);return enc;
  },
  fit(){helios.frameNetwork({animate:true,durationMs:350,paddingRatio:.09});},
  labels(on){if(!on)clearHighlight();helios.behavior.labels.enabled(on);},
  nodeSizeScale(v){helios.nodeSizeScale(+v);},
  edgeWidthScale(v){helios.edgeWidthScale(+v);},
  gravity(v){return perform(()=>{helios.behavior.layout.parameter('kGravity',+v);notify();});},
  select(node){const id=lookup.get(node.id);if(id!=null)helios.behavior.selection.selectOnly('node',id,{silent:false});},
  clearSelection(){helios.behavior.selection.clearSelection();},
  toggleLayout(){return perform(()=>{const layout=helios.behavior.layout;if(isRunning())layout.stop('atlas');else{layout.reheat('atlas');layout.start();}notify();return isRunning();});},
  mode(mode){return perform(async()=>{
   if(mode===helios.mode())return;
   const layout=helios.behavior.layout,resume=isRunning();transitioning=true;layout.stop('dimension-change');
   try{
    // Freeze forces during position handoff and camera projection changes.
    // Helios injects depth when expanding its GPU layout from 2D to 3D.
    await helios.setMode(mode,{animate:false,reheat:false});
   }finally{
    if(!disposed&&resume){layout.reheat('dimension-change');layout.start();}
    transitioning=false;notify();
   }
  });},
  edgeOpacity(v){helios.behavior.mappers.setChannelConfig('edge','opacity',{type:'constant',value:+v});},
  destroy(){if(disposed)return;disposed=true;clearHighlight();container.removeEventListener('pointerover',labelEnter);container.removeEventListener('pointerout',labelLeave);container.removeEventListener('pointerleave',clearHighlight);tip.remove();helios.behavior.layout.stop('destroy');helios.stopCameraTransition();pending.finally(()=>helios.destroy());},
 };
 try{controller.setColor(colorBy);controller.setFilters(filters);notify();}catch(error){controller.destroy();throw error;}
 return controller;
}
