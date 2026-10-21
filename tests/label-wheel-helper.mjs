import assert from 'node:assert/strict';

export async function checkLabelWheel(page,view){
 await page.evaluate(()=>window.sqbits.graph.helios.behavior.selection.selectNodes([0,1],{mode:'replace'}));
 const initial=await page.evaluate(()=>{
  const h=window.sqbits.graph.helios;window.labelWheelGraph=window.sqbits.graph;
  const values=e=>Object.fromEntries(['clientX','clientY','screenX','screenY','deltaX','deltaY','deltaZ','deltaMode','ctrlKey','shiftKey','altKey','metaKey'].map(k=>[k,e[k]]));
  window.labelWheelSources=[];window.labelWheelCanvasEvents=[];
  window.labelWheelSourceListener=e=>{if(e.target.closest?.('.helios-label'))window.labelWheelSources.push({trusted:e.isTrusted,...values(e)});};
  window.labelWheelCanvasListener=e=>window.labelWheelCanvasEvents.push(values(e));
  document.querySelector('#chart').addEventListener('wheel',window.labelWheelSourceListener,true);
  h.renderer.canvas.addEventListener('wheel',window.labelWheelCanvasListener);
  return {mode:h.mode(),selected:[...h.behavior.selection.getPublicState().selectedNodes],page:scrollY,center:document.querySelector('.visual-column').scrollTop};
 });
 try{
  for(const delta of [-120,120]){
   const point=await (await page.waitForFunction(()=>{
    const chart=document.querySelector('#chart').getBoundingClientRect();
    for(const label of document.querySelectorAll('.helios-label[data-node-id]')){
     const r=label.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
     if(r.width>0&&r.left>chart.left&&r.right<chart.right&&r.top>chart.top&&r.bottom<Math.min(chart.bottom,innerHeight)&&document.elementFromPoint(x,y)?.closest('.helios-label')===label)return {x,y};
    }
    return null;
   })).jsonValue();
   await page.mouse.move(point.x,point.y);await page.waitForFunction(()=>window.sqbits.graph.helios._highlightUnion.nodes.size>0);
   const before=await page.evaluate(()=>{
    const c=window.sqbits.graph.helios.renderer.camera;window.labelWheelSources=[];window.labelWheelCanvasEvents=[];
    return {zoom:c.zoom,distance:c.distance,pan:Array.from(c.pan2D),viewport:{...c.viewport},rect:c.canvas.getBoundingClientRect().toJSON()};
   });
   // Control+wheel also represents a trackpad pinch on desktop browsers.
   if(delta<0)await page.keyboard.down('Control');
   await page.mouse.wheel(0,delta);
   if(delta<0)await page.keyboard.up('Control');
   await page.waitForFunction(()=>window.labelWheelCanvasEvents.length>0);
   const after=await page.evaluate(()=>{
    const g=window.sqbits.graph,h=g.helios,c=h.renderer.camera;
    return {zoom:c.zoom,distance:c.distance,pan:Array.from(c.pan2D),sources:window.labelWheelSources,events:window.labelWheelCanvasEvents,selected:[...h.behavior.selection.getPublicState().selectedNodes],sameGraph:g===window.labelWheelGraph,page:scrollY,center:document.querySelector('.visual-column').scrollTop,browserScale:visualViewport.scale};
   });
   assert.equal(after.sources.length,1,'A real wheel gesture must land on a label');assert.equal(after.sources[0].trusted,true);
   assert.equal(after.events.length,1,'Forward exactly once, without recursion or double zoom');
   const {trusted,...source}=after.sources[0];assert.deepEqual(after.events[0],source,'Retain coordinates, deltas, modes and modifiers');assert.equal(source.ctrlKey,delta<0);
   const expected=initial.mode==='2d'?before.zoom*Math.exp(-delta*.001):before.distance*Math.exp(delta*.001),actual=initial.mode==='2d'?after.zoom:after.distance;
   assert.ok(Math.abs(actual-expected)<Math.max(1,expected)*1e-6,'Use the native camera response for exactly one wheel gesture');
   if(initial.mode==='2d'){
    const sx=(source.clientX-before.rect.left)/before.rect.width*before.viewport.width,sy=(source.clientY-before.rect.top)/before.rect.height*before.viewport.height;
    assert.ok(Math.abs((sx-before.viewport.width/2-before.pan[0])/before.zoom-(sx-before.viewport.width/2-after.pan[0])/after.zoom)<1e-5,'Keep the cursor world X fixed');
    assert.ok(Math.abs((before.viewport.height/2-sy-before.pan[1])/before.zoom-(before.viewport.height/2-sy-after.pan[1])/after.zoom)<1e-5,'Keep the cursor world Y fixed');
   }
   assert.deepEqual(after.selected,initial.selected);assert.equal(after.sameGraph,true);assert.equal(after.page,initial.page);assert.equal(after.center,initial.center);assert.equal(after.browserScale,1);
  }
  await page.mouse.move(10,10);await page.waitForFunction(()=>window.sqbits.graph.helios._highlightUnion.nodes.size===0);
  console.log('LABEL_WHEEL_ZOOM_PASSED',view,initial.mode,{nativeCamera:true,hoverAndSelectionPreserved:true});
 }finally{
  await page.evaluate(()=>{
   document.querySelector('#chart').removeEventListener('wheel',window.labelWheelSourceListener,true);
   window.sqbits.graph.helios.renderer.canvas.removeEventListener('wheel',window.labelWheelCanvasListener);
   window.sqbits.graph.clearSelection();
  });
 }
}
