import {chromium} from 'playwright';import {existsSync,readdirSync,mkdirSync} from 'node:fs';import {homedir} from 'node:os';import assert from 'node:assert/strict';
import {setYearRange} from './year-range-helpers.mjs';
const root=homedir()+'/.cache/ms-playwright',executablePath=readdirSync(root).filter(n=>/^chromium-\d+$/.test(n)).sort().map(n=>`${root}/${n}/chrome-linux64/chrome`).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const base=(process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/').split('#')[0];mkdirSync('verification',{recursive:true});
const views=process.env.SQBITS_TEST_NETWORK?[process.env.SQBITS_TEST_NETWORK]:['papers','devices'];
try{
 await page.goto(base+'#trends');await page.waitForFunction(()=>window.sqbits?.trends?.aggregate);await page.evaluate(()=>{for(const n of Object.values(window.sqbits.state.networks))n.running=false;});
 for(const view of views){
  await page.locator(`[data-view=${view}]`).first().click();await page.waitForFunction(()=>window.sqbits.graph&&!document.querySelector('#graph-mode').disabled);
  console.log('NATIVE_FILTER_READY',view);
  await page.evaluate(async()=>{const s=window.sqbits,h=s.graph.helios;window.originalGraph=s.graph;window.originalNetwork=h.network;window.originalLayout=h.layout();window.originalPositions=Array.from((await h.snapshotNodePositions([0,1,2,3])).positions);window.filterEvents=0;h.on('graph:filter-changed',()=>window.filterEvents++);});
  async function check(){const r=await page.evaluate(async()=>{
   const s=window.sqbits,h=s.graph.helios,data=s.state.view==='papers'?s.papers:s.devices,f=s.state.filters;
   const matchesDevice=(n,f,papers)=>['type','scope','geometry','substrate','realization','attribution','material'].every(k=>!f[k]||n[k]===f[k])&&(!f.community||String(n.community)===f.community)&&(!f.review||(f.review==='flagged')===n.review)&&(!f.yearMin||n.year!=null&&n.year>=+f.yearMin)&&(!f.yearMax||n.year!=null&&n.year<=+f.yearMax)&&(!f.search||[n.label,n.type,n.material,n.substrate,n.junction,n.geometry,papers[n.paper].label].join(' ').toLowerCase().includes(f.search.toLowerCase()));const expected=data.nodes.filter(n=>(f.includeIsolates||n.degree>0||String(f.community)==='0')&&(s.state.view==='devices'?matchesDevice(n,f,s.papers.nodes):(!f.search||[n.label,n.doi].join(' ').toLowerCase().includes(f.search.toLowerCase()))&&(!f.community||String(n.community)===f.community)&&(!f.review||(f.review==='flagged')===n.review)&&(!f.yearMin||n.year>=+f.yearMin)&&(!f.yearMax||n.year<=+f.yearMax)));
   const ids=h.network.withBufferAccess(()=>new Set(h._getRenderNetwork().nodeIndices)),rep=s.graph.representatives;
   return {same:s.graph===window.originalGraph&&h.network===window.originalNetwork&&h.layout()===window.originalLayout,base:h.network.nodeCount,expected:expected.length,actual:h.getGraphFilter(),positions:Array.from((await h.snapshotNodePositions([0,1,2,3])).positions),before:window.originalPositions,representativesActive:rep.every(r=>{const id=data.nodes.findIndex(n=>n.id===r.id);return ids.has(id);}),events:window.filterEvents};
  });assert.ok(r.same,'Filters must retain the same graph, network and layout');assert.equal(r.actual.scope,'render');assert.equal(r.actual.error,null);assert.equal(r.actual.nodeCount,r.expected);assert.deepEqual(r.positions,r.before,'Paused positions must be bit-for-bit stable');assert.ok(r.representativesActive);return r;}
  let r=await check();assert.ok(r.base>=r.actual.nodeCount);
  const before=await page.evaluate(()=>window.filterEvents);await setYearRange(page,2020,2024);await page.waitForFunction(n=>window.filterEvents>n,before);r=await check();console.log('NATIVE_YEAR_FILTER',view,{visible:r.actual.nodeCount,base:r.base});
  const change=async action=>{const n=await page.evaluate(()=>window.filterEvents);await action();await page.waitForFunction(n=>window.filterEvents>n,n);};
  if(view==='devices'){await change(()=>page.locator('#type').selectOption('fluxonium'));await check();}
  await change(()=>page.locator('#review').selectOption('flagged'));await check();
  if(view==='devices'){
   const chosen=await page.evaluate(()=>{const h=window.sqbits.graph.helios;return h.network.withBufferAccess(()=>window.sqbits.devices.nodes[h._getRenderNetwork().nodeIndices[0]]);});
   for(const key of ['scope','realization','attribution','community','material','substrate','geometry']){await change(()=>page.locator('#'+key).selectOption(String(chosen[key])));await check();}
   await page.evaluate(node=>window.sqbits.graph.select(node),chosen);await page.waitForSelector('#selection-list .selected-device');
   assert.match(await page.locator('#selection-list').innerText(),new RegExp(chosen.label.slice(0,20).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
   await page.evaluate(()=>window.sqbits.graph.clearSelection());
  }

  await change(()=>page.locator('#search').fill('zz-no-matching-entry'));r=await check();assert.equal(r.actual.nodeCount,0);assert.equal(await page.locator('#chart canvas').count()>0,true,'Empty filters retain the renderer');
  await change(()=>page.locator('#reset-filters').click());await check();
  await change(()=>page.locator('#include-isolates').check());r=await check();assert.equal(r.actual.nodeCount,r.base);
  await page.locator('#graph-mode').selectOption('3d');await page.waitForFunction(()=>window.sqbits.graph.helios.mode()==='3d'&&!document.querySelector('#graph-mode').disabled);await setYearRange(page,2021,2025);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.originalGraph===window.sqbits.graph&&window.originalLayout===window.sqbits.graph.helios.layout()),true);
  assert.equal(await page.evaluate(()=>window.sqbits.graph.helios.behavior.mappers.getSerializedChannelConfig('edge','color').type),'nodeToEdge');
  const panes=await page.evaluate(()=>{const r=e=>{const b=e.getBoundingClientRect();return {top:b.top,bottom:b.bottom,height:b.height,overflow:getComputedStyle(e).overflowY};};return {body:document.documentElement.scrollHeight,window:innerHeight,header:r(document.querySelector('.site-header')),filters:r(document.querySelector('.filters-panel')),center:r(document.querySelector('.visual-column')),side:r(document.querySelector('.selection-panel'))};});
  assert.ok(panes.header.height<=56);assert.ok(panes.filters.bottom<=panes.window);assert.equal(panes.filters.overflow,'auto');assert.equal(panes.center.overflow,'hidden');assert.ok(panes.side.height>500);assert.equal(panes.body,panes.window);
  await page.screenshot({path:`verification/native-filter-${view}.png`});console.log('NATIVE_NETWORK_FILTER_PASSED',view);
 }
 assert.deepEqual(errors,[]);
}catch(e){console.error(e);await page.screenshot({path:'verification/native-filter-failure.png'}).catch(()=>{});process.exitCode=1;}finally{await browser.close();}
