import {chromium} from 'playwright';
import {existsSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';

const root=homedir()+'/.cache/ms-playwright',executablePath=readdirSync(root).filter(n=>/^chromium-\d+$/.test(n)).sort().map(n=>`${root}/${n}/chrome-linux64/chrome`).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
const base=(process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/').split('#')[0];
mkdirSync('verification',{recursive:true});

async function check(type){
 await page.waitForFunction(t=>document.querySelector('.numeric-color-legend')?.dataset.scale===t,type);
 const result=await page.evaluate(async()=>{
  await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
  const g=window.sqbits.graph,h=g.helios,e=g.encoding,config=h.behavior.mappers.getSerializedChannelConfig('node','color');
  const samples=h.network.withBufferAccess(()=>{
   const colors=h.network.getNodeAttributeBuffer('_helios_visuals_color').view,values=h.network.getNodeAttributeBuffer('node_color').view;
   const nodes=window.sqbits.state.view==='devices'?window.sqbits.devices.nodes:window.sqbits.papers.nodes;
   const candidates=[...h.network.nodeIndices].filter(i=>Number.isFinite(values[i]));
   const ids=[...new Set([candidates[0],candidates[Math.floor(candidates.length/2)],candidates.at(-1),...candidates.filter(i=>values[i]===0).slice(0,1)])].filter(i=>i!=null);
   return ids.map(id=>({actual:Array.from(colors.slice(id*4,id*4+3)),expected:e.color(nodes[id]),attribute:values[id],expectedAttribute:e.mapperValue(nodes[id])}));
  });
  const ticks=[...document.querySelectorAll('.colorbar-tick')].map(t=>({value:+t.dataset.value,offset:+t.dataset.offset,expected:e.position(+t.dataset.value)}));
  return {config,samples,ticks,type:e.type,domain:e.domain,edgeColor:h.behavior.mappers.getSerializedChannelConfig('edge','color'),sameGraph:!window.colorbarGraph||g===window.colorbarGraph};
 });
 assert.equal(result.type,type);assert.equal(result.config.transformType,type==='log-complement'?'log':type);assert.deepEqual(result.config.domain,result.domain);assert.equal(result.sameGraph,true);
 const {rgb}=await import('d3');
 for(const sample of result.samples){const c=rgb(sample.expected);assert.ok(sample.actual.every((v,i)=>Math.abs(v-[c.r,c.g,c.b][i]/255)<1/255+1e-5),'Actual Helios colors must match the colorbar');assert.ok(Math.abs(sample.attribute-sample.expectedAttribute)<=Math.max(1,Math.abs(sample.expectedAttribute))*1e-6);}
 for(const tick of result.ticks)assert.ok(Math.abs(tick.offset-tick.expected)<1e-8);
 assert.equal(result.edgeColor.type,'nodeToEdge');assert.equal(result.edgeColor.endpoints,'both');
 return result;
}

try{
 await page.goto(base+'#trends');await page.waitForFunction(()=>window.sqbits?.trends?.aggregate);await page.evaluate(()=>{for(const s of Object.values(window.sqbits.state.networks))s.running=false;});
 await page.locator('[data-view=devices]').first().click();await page.waitForFunction(()=>window.sqbits.graph&&!document.querySelector('#graph-mode').disabled);await page.evaluate(()=>{window.colorbarGraph=window.sqbits.graph;});
 await page.locator('#color').selectOption('t1');const first=await check('log');assert.match(await page.locator('.colorbar-title').innerText(),/µs/);assert.equal(await page.locator('#color-scale').inputValue(),'auto');
 const domain=first.domain,ticks=await page.locator('.colorbar-tick').allTextContents();await page.locator('#type').selectOption('fluxonium');await page.waitForFunction(()=>window.sqbits.graph.helios.getGraphFilter().options?.nodeQuery?.includes('fluxonium'));
 assert.deepEqual((await check('log')).domain,domain);assert.deepEqual(await page.locator('.colorbar-tick').allTextContents(),ticks);
 const cdp=await page.context().newCDPSession(page),shot=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:false,captureBeyondViewport:false});writeFileSync('verification/t1-network-colorbar.png',Buffer.from(shot.data,'base64'));
 await page.locator('#color-scale').selectOption('linear');await check('linear');await page.locator('#color-scale').selectOption('auto');await check('log');
 await page.locator('#color').selectOption('readout_fidelity');await check('log-complement');assert.match(await page.locator('.colorbar-title').innerText(),/100%/);assert.ok((await page.locator('.colorbar-tick').evaluateAll(t=>t.map(e=>+e.dataset.value))).every(v=>v>=0&&v<=100));
 await page.locator('#color').selectOption('logical_error');await check('log');await page.locator('#color').selectOption('year');await check('linear');
 await page.locator('#color').selectOption('type');assert.equal(await page.locator('.colorbar').count(),0);assert.equal(await page.locator('#color-scale-field').isVisible(),false);
 await page.locator('#color').selectOption('t1');await check('log');await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.equal(await page.locator('.colorbar').isVisible(),true);
 await page.setViewportSize({width:1500,height:1100});await page.locator('[data-view=timeline]').first().click();await page.waitForFunction(()=>window.sqbits.chart?.count>0);await page.locator('#color').selectOption('t1');await page.waitForSelector('.numeric-color-legend[data-scale=log]');
 assert.match(await page.locator('.colorbar-title').innerText(),/µs/);await page.locator('#color-scale').selectOption('linear');await page.waitForSelector('.numeric-color-legend[data-scale=linear]');
 assert.deepEqual(errors,[]);console.log('NATIVE_COLORBAR_AND_ATTRIBUTE_SCALES_PASSED',{samples:first.samples.length,ticks:first.ticks.length,domain});
}catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();}
