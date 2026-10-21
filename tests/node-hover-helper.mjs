import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';

export async function checkNodeHover(page,view){
 await page.mouse.move(10,10);await page.evaluate(()=>{const g=window.sqbits.graph;g.clearSelection();g.labels(false);});
 await page.locator('#chart').scrollIntoViewIfNeeded();
 // Project Helios's own layout positions; never assign test coordinates.
 const candidates=await page.evaluate(async()=>{
  const h=window.sqbits.graph.helios,ids=h.network.withBufferAccess(()=>Array.from(h.network.nodeIndices).slice(0,1024)),snapshot=await h.snapshotNodePositions(ids),m=h.renderer.camera.getUniforms().viewProjection,r=h.renderer.canvas.getBoundingClientRect(),points=[];
  for(let i=0;i<ids.length;i++){
   const [x,y,z]=snapshot.positions.slice(i*3,i*3+3),w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)continue;
   const sx=r.x+((m[0]*x+m[4]*y+m[8]*z+m[12])/w*.5+.5)*r.width,sy=r.y+(1-((m[1]*x+m[5]*y+m[9]*z+m[13])/w*.5+.5))*r.height;
   if(sx>r.left+15&&sx<Math.min(r.right-15,innerWidth-15)&&sy>Math.max(r.top+15,15)&&sy<Math.min(r.bottom-15,innerHeight-15))points.push({x:sx,y:sy});
  }
  return points.slice(0,20);
 });
 assert.ok(candidates.length,'Need a visible node from the native layout');
 await page.evaluate(()=>{const h=window.sqbits.graph.helios;window.nodeHoverGraph=window.sqbits.graph;window.nodeHoverBuffers=h.network.withBufferAccess(()=>[h.network.getNodeAttributeBuffer('_helios_visuals_state').view.slice(),h.network.getEdgeAttributeBuffer('_helios_visuals_edge_state').view.slice()]);});
 let hit=false;
 for(const point of candidates){
  await page.mouse.move(point.x,point.y);
  try{await page.waitForFunction(()=>window.sqbits.graph.helios.behavior.hover.getPublicState().hoveredNode>=0,null,{timeout:2000});hit=true;break;}catch{}
 }
 assert.ok(hit,'A real mouse movement must pick a rendered node');
 const state=await page.evaluate(()=>{
  const h=window.sqbits.graph.helios,s=h.behavior.hover.getPublicState(),l=h.renderer.graphLayer;
  const incidentEdges=h.network.withBufferAccess(()=>Array.from(h.network.edgeIndices).filter(id=>h.network.edgesView[id*2]===s.hoveredNode||h.network.edgesView[id*2+1]===s.hoveredNode).length);
  const unmodified=h.network.withBufferAccess(()=>[h.network.getNodeAttributeBuffer('_helios_visuals_state').view,h.network.getEdgeAttributeBuffer('_helios_visuals_edge_state').view].every((a,i)=>a.every((v,j)=>v===window.nodeHoverBuffers[i][j])));
  return {node:s.hoveredNode,incidentEdges,propagates:l.propagateHoveredNodeToEdges,virtual:l.hoveredNodeIsVirtual,renderNode:l.hoveredNodeIndex,dimNodes:l.nodeNoStateStyleEnabled,dimEdges:l.edgeNoStateStyleEnabled,hoverStyleFromHighlight:h.hoverStyleFromHighlight(),nodeStyle:h.nodeHoverStyle(),nodeHighlight:h.nodeStateStyle('HIGHLIGHTED'),edgeStyle:h.edgeHoverStyle(),edgeHighlight:h.edgeStateStyle('HIGHLIGHTED'),union:h._highlightUnion.nodes.size+h._highlightUnion.edges.size,unmodified,selected:[...h.behavior.selection.getPublicState().selectedNodes],sameGraph:window.sqbits.graph===window.nodeHoverGraph,mode:h.mode()};
 });
 assert.ok(state.node>=0);assert.ok(state.incidentEdges>0);assert.equal(state.propagates,true);assert.equal(state.virtual,true);assert.equal(state.renderNode,state.node);
 assert.equal(state.dimNodes,true);assert.equal(state.dimEdges,true);assert.equal(state.hoverStyleFromHighlight,true);assert.equal(state.nodeStyle.sizeMul,state.nodeHighlight.sizeMul);assert.equal(state.edgeStyle.widthMul,state.edgeHighlight.widthMul);assert.equal(state.edgeStyle.opacityMul,state.edgeHighlight.opacityMul);
 assert.ok(state.nodeStyle.sizeMul>1);assert.ok(state.edgeStyle.opacityMul>1);assert.equal(state.union,0);assert.equal(state.unmodified,true);assert.deepEqual(state.selected,[]);assert.equal(state.sameGraph,true);
 assert.equal(await page.locator('.graph-tooltip').isVisible(),true);
 const cdp=await page.context().newCDPSession(page),capture=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:false,captureBeyondViewport:false});writeFileSync(`verification/node-hover-${view}-${state.mode}.png`,Buffer.from(capture.data,'base64'));
 // Hover must clear without erasing an existing evidence selection.
 await page.evaluate(()=>window.sqbits.graph.helios.behavior.selection.selectNodes([0,1],{mode:'replace'}));
 await page.mouse.move(10,10);await page.waitForFunction(()=>window.sqbits.graph.helios.behavior.hover.getPublicState().hoveredNode<0);
 assert.deepEqual(await page.evaluate(()=>[...window.sqbits.graph.helios.behavior.selection.getPublicState().selectedNodes].sort()),[0,1]);
 await page.evaluate(()=>window.sqbits.graph.clearSelection());
 const cleared=await page.evaluate(()=>{const h=window.sqbits.graph.helios,l=h.renderer.graphLayer;return {virtual:l.hoveredNodeIsVirtual,index:l.hoveredNodeIndex,dimNodes:l.nodeNoStateStyleEnabled,dimEdges:l.edgeNoStateStyleEnabled,union:h._highlightUnion.nodes.size+h._highlightUnion.edges.size};});
 assert.deepEqual(cleared,{virtual:false,index:4294967295,dimNodes:false,dimEdges:false,union:0});
 assert.equal(await page.locator('.graph-tooltip').isVisible(),false);await page.evaluate(()=>window.sqbits.graph.labels(true));
 console.log('NODE_HOVER_PASSED',view,state.mode,{node:state.node,incidentEdges:state.incidentEdges,noStateBufferWrites:state.unmodified});
}
