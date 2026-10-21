import {chromium} from 'playwright';
import {setYearRange} from './year-range-helpers.mjs';
import {checkNodeHover} from './node-hover-helper.mjs';
import {existsSync,mkdirSync,readdirSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';

const root=`${homedir()}/.cache/ms-playwright`;
const executablePath=readdirSync(root).filter(n=>/^chromium-\d+$/.test(n)).sort().map(n=>`${root}/${n}/chrome-linux64/chrome`).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1200}}),errors=[];
page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text()+' '+(m.location().url||''));});
const url=(process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/').split('#')[0];
const views=process.env.SQBITS_TEST_NETWORK?[process.env.SQBITS_TEST_NETWORK]:['papers','devices'];
mkdirSync('verification',{recursive:true});
async function ready(){await page.waitForFunction(()=>window.sqbits?.graph&&!document.querySelector('#gravity')?.disabled);}
async function slider(id,value){const input=page.locator('#'+id);await input.evaluate((el,v)=>{el.value=String(v-Number(el.step));},value);await input.press('ArrowRight');}
async function snapshot(){return page.evaluate(async()=>Array.from((await window.sqbits.graph.helios.snapshotNodePositions([0,1,2,3])).positions));}
async function checkNetwork(view){
 await ready();
 console.log('NETWORK_CONTROLS_START',view);
 if(process.env.SQBITS_TEST_HOVER_ONLY==='1'){
  if(await page.evaluate(()=>window.sqbits.graph.running))await page.locator('#layout-toggle').click();
  await page.waitForFunction(()=>!window.sqbits.graph.running&&!document.querySelector('#layout-toggle').disabled);
  await checkNodeHover(page,view);
  await page.locator('#graph-mode').selectOption('3d');await page.waitForFunction(()=>window.sqbits.graph.helios.mode()==='3d'&&!document.querySelector('#graph-mode').disabled);
  await checkNodeHover(page,view);return;
 }
 await page.evaluate(()=>{window.controlTestLayout=window.sqbits.graph.helios.layout();});
 const initial=await page.evaluate(()=>{const h=window.sqbits.graph.helios;return {width:h.edgeWidthScale(),size:h.nodeSizeScale(),gravity:h.behavior.layout.parameter('kGravity'),edgeColor:h.behavior.mappers.getSerializedChannelConfig('edge','color'),renderMode:h.renderer.graphLayer.getEffectiveEdgeRenderingMode()};});
 assert.equal(initial.width,1.5);assert.equal(initial.size,1);assert.equal(initial.gravity,.001);assert.equal(initial.renderMode,'quad');
 assert.equal(initial.edgeColor.type,'nodeToEdge');assert.equal(initial.edgeColor.attributes,'@node.color');assert.equal(initial.edgeColor.endpoints,'both');
 if(await page.evaluate(()=>window.sqbits.graph.running))await page.locator('#layout-toggle').click();
 await page.waitForFunction(()=>!window.sqbits.graph.running&&!document.querySelector('#layout-toggle').disabled);
 const before=await snapshot();
 await slider('edge-width',3);await slider('node-size',1.75);await slider('gravity',-2.5);
 await page.waitForFunction(()=>Math.abs(window.sqbits.graph.helios.behavior.layout.parameter('kGravity')-10**-2.5)<1e-10);
 assert.equal(await page.evaluate(()=>window.sqbits.graph.running),false,'A gravity adjustment must respect manual pause');
 assert.equal(await page.evaluate(()=>window.sqbits.graph.helios.edgeWidthScale()),3);assert.equal(await page.evaluate(()=>window.sqbits.graph.helios.nodeSizeScale()),1.75);
 assert.deepEqual(await snapshot(),before,'Appearance/gravity controls must not reseed positions');
 assert.equal(await page.evaluate(()=>window.controlTestLayout===window.sqbits.graph.helios.layout()),true);
 assert.equal(await page.locator('#edge-width-value').innerText(),'3×');assert.equal(await page.locator('#node-size-value').innerText(),'1.75×');
 console.log('SLIDERS_PASSED',view);
 await checkNodeHover(page,view);
 await page.evaluate(()=>document.querySelector('#chart').scrollIntoView({block:'center',behavior:'instant'}));await page.waitForSelector('.helios-label[data-node-id]:visible');
 await page.evaluate(()=>window.sqbits.graph.helios.behavior.selection.selectNodes([0,1],{mode:'replace'}));
 const selected=await page.evaluate(()=>Array.from(window.sqbits.graph.helios.behavior.selection.getPublicState().selectedNodes));
 const hoverLabel=async()=>{
  // Pinned labels can overlap or be reordered after selection. Hit the actual
  // topmost label, then validate its full source label rather than clipped text.
  const point=await (await page.waitForFunction(()=>{
   const chart=document.querySelector('#chart').getBoundingClientRect();
   for(const el of document.querySelectorAll('.helios-label[data-node-id]')){
    const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    if(r.width>0&&r.x>chart.left&&r.right<chart.right&&r.y>chart.top&&r.bottom<Math.min(chart.bottom,innerHeight)&&document.elementFromPoint(x,y)?.closest('.helios-label')===el)return {x,y};
   }
   return null;
  })).jsonValue();
  await page.mouse.move(point.x,point.y);
 };
 await hoverLabel();
 await page.waitForFunction(()=>window.sqbits.graph.helios._highlightUnion.nodes.size>0);
 const highlight=await page.evaluate(view=>{
  const h=window.sqbits.graph.helios,nodes=(view==='papers'?window.sqbits.papers:window.sqbits.devices).nodes;
  const hovered=document.querySelector('.helios-label:hover');if(!hovered)throw new Error('Expected a real pointer hover on a community label');
  const label=h.labels().source(Number(hovered.dataset.nodeId));
  const expected=nodes.filter(n=>n.degree>0&&n.communityLabel===label).length;
  const marked=h.network.withBufferAccess(()=>Array.from(h.network.nodeIndices).filter(id=>(Number(h.network.getNodeAttributeBuffer('_helios_visuals_state').view[id])&h.constructor.STATES.HIGHLIGHTED)!==0).length);
  return {expected,marked,union:h._highlightUnion.nodes.size,edges:h._highlightUnion.edges.size,selected:Array.from(h.behavior.selection.getPublicState().selectedNodes)};
 },view);
 assert.ok(highlight.expected>1);assert.equal(highlight.marked,highlight.expected);assert.equal(highlight.union,highlight.expected);assert.ok(highlight.edges>0);assert.deepEqual(highlight.selected,selected);
 console.log('COMMUNITY_HOVER_PASSED',view,{members:highlight.marked,edges:highlight.edges});
 await page.mouse.move(10,10);await page.waitForFunction(()=>window.sqbits.graph.helios._highlightUnion.nodes.size===0);
 assert.deepEqual(await page.evaluate(()=>Array.from(window.sqbits.graph.helios.behavior.selection.getPublicState().selectedNodes)),selected,'Hover must preserve the evidence selection');
 await page.locator('#color').selectOption('year');
 const recolored=await page.evaluate(()=>window.sqbits.graph.helios.behavior.mappers.getSerializedChannelConfig('edge','color'));
 assert.equal(recolored.type,'nodeToEdge');assert.equal(recolored.attributes,'@node.color');assert.equal(recolored.endpoints,'both');
 await page.locator('#color').selectOption('community');
 await hoverLabel();await page.waitForFunction(()=>window.sqbits.graph.helios._highlightUnion.nodes.size>0);
 await page.evaluate(()=>window.sqbits.graph.labels(false));assert.equal(await page.evaluate(()=>window.sqbits.graph.helios._highlightUnion.nodes.size),0);
 await page.evaluate(()=>{window.sqbits.graph.labels(true);window.sqbits.graph.clearSelection();});
 await page.locator('#layout-toggle').click();await page.waitForFunction(()=>window.sqbits.graph.running);
 await slider('gravity',-2.8);await page.waitForFunction(()=>Math.abs(window.sqbits.graph.helios.behavior.layout.parameter('kGravity')-10**-2.8)<1e-10);
 await page.waitForFunction(async old=>Array.from((await window.sqbits.graph.helios.snapshotNodePositions([0,1,2,3])).positions).some((v,i)=>Math.abs(v-old[i])>.01),before);
 await page.locator('#graph-mode').selectOption('3d');await page.waitForFunction(()=>window.sqbits.graph.helios.mode()==='3d'&&!document.querySelector('#graph-mode').disabled);
 const depth=await snapshot();assert.ok(depth.every(Number.isFinite));assert.ok(depth.some((v,i)=>i%3===2&&Math.abs(v)>0));
 assert.equal(await page.evaluate(()=>window.controlTestLayout===window.sqbits.graph.helios.layout()),true);
 if(await page.evaluate(()=>window.sqbits.graph.running))await page.locator('#layout-toggle').click();
 await page.waitForFunction(()=>!window.sqbits.graph.running&&!document.querySelector('#layout-toggle').disabled);
 // Native filtering must preserve the engine and all user settings.
 await checkNodeHover(page,view);
 if(view==='devices')await page.locator('#type').selectOption('fluxonium');else await setYearRange(page,2020,2026);
 await page.waitForFunction(()=>window.sqbits.graph?.helios.getGraphFilter().enabled&&!document.querySelector('#gravity').disabled);assert.equal(await page.evaluate(()=>window.sqbits.graph.helios.layout()===window.controlTestLayout),true);
 const persisted=await page.evaluate(()=>{const h=window.sqbits.graph.helios;return {width:h.edgeWidthScale(),size:h.nodeSizeScale(),gravity:h.behavior.layout.parameter('kGravity'),mode:h.mode(),running:window.sqbits.graph.running};});
 assert.deepEqual(persisted,{width:3,size:1.75,gravity:10**-2.8,mode:'3d',running:false});
 const cdp=await page.context().newCDPSession(page),capture=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:false,captureBeyondViewport:false});
 writeFileSync(`verification/network-controls-${view}.png`,Buffer.from(capture.data,'base64'));
 console.log('NETWORK_CONTROLS_PASSED',view,{communityMembers:highlight.expected,highlightedEdges:highlight.edges,...persisted});
}
try{
 await page.goto(url+'#'+(process.env.SQBITS_TEST_HOVER_ONLY==='1'?'trends':views[0]));
 if(process.env.SQBITS_TEST_HOVER_ONLY==='1'){await page.waitForFunction(()=>window.sqbits?.trends?.aggregate);await page.evaluate(()=>{for(const s of Object.values(window.sqbits.state.networks))s.running=false;});}
 for(const view of views){if(await page.evaluate(()=>window.sqbits?.state.view)!==view)await page.locator(`[data-view="${view}"]`).first().click();await checkNetwork(view);}
 if(views.includes('papers')&&process.env.SQBITS_TEST_HOVER_ONLY!=='1'){if(views.length>1)await page.locator('[data-view="papers"]').first().click();await ready();assert.equal(await page.locator('#edge-width').inputValue(),'3');assert.equal(await page.locator('#node-size').inputValue(),'1.75');}
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 for(const id of ['edge-width','node-size','gravity'])assert.ok(await page.locator('#'+id).isVisible());
 assert.deepEqual(errors,[]);console.log('NETWORK_CONTROL_BROWSER_CHECKS_PASSED');
}catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();}
