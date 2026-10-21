import HeliosNetwork,{AttributeType} from 'helios-network';
import {Helios,EVENTS} from '../node_modules/helios-web/src/index.js';
import {encoding,numeric,pretty,esc,fmt} from './data.js';

export async function mountGraph(container,{nodes,edges,directed,colorBy,onSelect,onEdge,mode='2d',running=true,onLayoutState}){
 const network=await HeliosNetwork.create({directed,initialEdges:Math.max(1,edges.length)});
 if(!container.isConnected){network.dispose();return null;}
 const handles=network.addNodes(nodes.length),lookup=new Map(nodes.map((n,i)=>[n.id,Number(handles[i])])),byIndex=new Map(nodes.map((n,i)=>[Number(handles[i]),n]));
 const edgeHandles=network.addEdges(edges.map(e=>[lookup.get(e.source),lookup.get(e.target)]));
 const representatives=new Map();for(const n of nodes){if(n.community&&(!representatives.has(n.community)||representatives.get(n.community).degree<n.degree))representatives.set(n.community,n);}
 network.nodeAttribute('label',(_,id,i)=>representatives.get(nodes[i].community)===nodes[i]?nodes[i].communityLabel:'')
  .nodeAttribute('score',(_,id,i)=>Math.log1p(nodes[i].degree),{type:AttributeType.Float});
 let helios;
 try{
  // Helios owns initialization, forces, positions and dimensional transitions.
  // In particular, do not replace the engine when resuming a paused layout.
  helios=new Helios(network,{container,mode,layout:{type:'gpu-force'},storage:false,session:false,fileDrop:false,ui:false,quickControls:false,autoCleanup:false,disposeNetworkOnDestroy:true,
   density:false,legends:false,edgeFastRendering:true,interactionRenderOrder:true,
   behaviors:{layout:{running},
    labels:{enabled:true,source:'label',selectionMode:'ranked',maxVisible:28,maxChars:44,minScreenRadiusPx:0,fontSizeScale:.95,outlineWidth:4,fill:'#22413d',outlineColor:'#f8f8f3'},
    hover:{hoverLabel:false},appearance:{background:'#f4f6f2',shadedEnabled:false,shadedNodes:false,shadedEdges:false}}});
  await helios.ready;
  if(!container.isConnected){helios.destroy();return null;}
  helios.behavior.labels.update({enabled:true,source:id=>{const n=byIndex.get(id);return n&&representatives.get(n.community)===n?n.communityLabel:null;},selectionMode:'ranked',pinnedNodes:[...representatives.values()].map(n=>lookup.get(n.id)),maxVisible:28,minScreenRadiusPx:0,maxChars:44,fontSizeScale:.95,outlineWidth:4,fill:'#22413d',outlineColor:'#f8f8f3'});
  helios.behavior.mappers.setChannelConfig('node','size',{type:'linear',attributes:'score',domain:[0,Math.max(1,...nodes.map(n=>Math.log1p(n.degree)))],range:[1.5,7]});
  helios.behavior.mappers.setChannelConfig('node','opacity',{type:'constant',value:.92});
  helios.behavior.mappers.setChannelConfig('edge','opacity',{type:'constant',value:.12});
  helios.behavior.mappers.setChannelConfig('edge','width',{type:'constant',value:.7});
  helios.semanticZoomExponent(.65);
 }catch(error){helios?.destroy();if(!helios)network.dispose();throw error;}
 const tip=document.createElement('div');tip.className='graph-tooltip';tip.hidden=true;container.append(tip);
 helios.on(EVENTS.NODE_CLICK,e=>{const n=byIndex.get(e.detail?.index);if(n)onSelect(n);});
 const edgeByIndex=new Map(Array.from(edgeHandles,(id,i)=>[Number(id),edges[i]]));
 helios.on(EVENTS.EDGE_CLICK,e=>{const edge=edgeByIndex.get(e.detail?.index);if(edge)onEdge?.(edge);});
 helios.on(EVENTS.NODE_HOVER,e=>{const d=e.detail||{},n=byIndex.get(d.index);if(d.state==='out'||!n){tip.hidden=true;return;}tip.innerHTML=`<strong>${esc(n.label)}</strong><span>${esc(n.year||'Year unknown')} · ${esc(n.communityLabel)}<br>${fmt(n.degree)} connections${n.review?' · Review flagged':''}</span>`;tip.hidden=false;const r=container.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(r.width-300,d.clientX-r.left+14))+'px';tip.style.top=Math.max(8,Math.min(r.height-130,d.clientY-r.top+14))+'px';});
 let disposed=false,transitioning=false,pending=Promise.resolve();
 // Helios reports a naturally cooled layout as idle, distinct from running.
 const isRunning=()=>helios.behavior.layout.runState()==='running';
 const notify=()=>{if(!disposed&&!transitioning)onLayoutState?.({running:isRunning(),mode:helios.mode()});};
 helios.on(EVENTS.LAYOUT_START,notify);helios.on(EVENTS.LAYOUT_STOP,notify);
 // Serialize layout/camera operations, including calls made while controls are
 // busy. Deferring destruction lets an in-flight GPU readback finish safely.
 const perform=action=>{const result=pending.then(()=>{if(!disposed)return action();});pending=result.catch(()=>{});return result;};
 const controller={
  helios,
  get running(){return !disposed&&isRunning();},
  setColor(key){const enc=encoding(nodes,key);if(enc.numeric){network.nodeAttribute('node_color',(_,id,i)=>Number.isFinite(numeric(nodes[i],key))?numeric(nodes[i],key):NaN,{type:AttributeType.Float});const values=nodes.map(n=>numeric(n,key)).filter(Number.isFinite);const lo=values.length?Math.min(...values):0,hi=values.length?Math.max(...values):1;helios.behavior.mappers.setChannelConfig('node','color',{type:'colormap',attributes:'node_color',colormap:'interpolateViridis',domain:[lo,hi===lo?lo+1:hi],defaultValue:'#a4ada9'});}
   else{const index=new Map(enc.domain.map((v,i)=>[v,i]));network.nodeAttribute('category_color',(_,id,i)=>index.get(enc.get(nodes[i])),{type:AttributeType.Category});network.setNodeAttributeCategoryDictionary('category_color',enc.domain.map((v,i)=>({id:i,label:pretty(v)})),{remapExisting:false});helios.behavior.mappers.setChannelConfig('node','color',{type:'categorical',attributes:'category_color',domain:enc.domain.map((_,i)=>i),range:enc.domain.map(v=>enc.color(nodes.find(n=>enc.get(n)===v))),defaultValue:'#a4ada9'});}
   helios.behavior.legends.enabled(false);return enc;
  },
  fit(){helios.frameNetwork({animate:true,durationMs:350,paddingRatio:.09});},
  labels(on){helios.behavior.labels.enabled(on);},
  select(node){const id=lookup.get(node.id);if(id!=null)helios.behavior.selection.selectOnly('node',id,{silent:true});},
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
  destroy(){if(disposed)return;disposed=true;tip.remove();helios.behavior.layout.stop('destroy');helios.stopCameraTransition();pending.finally(()=>helios.destroy());},
 };
 controller.setColor(colorBy);notify();
 return controller;
}
