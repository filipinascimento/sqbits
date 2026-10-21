import {chromium} from 'playwright';
import {existsSync,mkdirSync,readdirSync} from 'node:fs';import {homedir} from 'node:os';import assert from 'node:assert/strict';
import {setYearRange} from './year-range-helpers.mjs';
const root=homedir()+'/.cache/ms-playwright',executablePath=readdirSync(root).filter(n=>/^chromium-\d+$/.test(n)).sort().map(n=>`${root}/${n}/chrome-linux64/chrome`).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:1100},hasTouch:true}),errors=[];
page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const base=(process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/').split('#')[0];
const values=selector=>page.locator(selector+' input[type=range]').evaluateAll(inputs=>inputs.map(n=>+n.value));
const waitTrends=(lo,hi)=>page.waitForFunction(([lo,hi])=>{const a=window.sqbits.trends?.aggregate;return a&&a.population.yearMin===lo&&a.population.yearMax===hi;},[lo,hi]);
async function startBandDrag(selector,delta,useGrip=false){
 await page.locator(selector).scrollIntoViewIfNeeded();const band=await page.locator(selector+(useGrip?' .year-range-grip':' .helios-ui-range2__range')).boundingBox(),track=await page.locator(selector+' .helios-ui-range2__track').boundingBox();
 const extent=await page.locator(selector+' input[type=range]').first().evaluate(n=>+n.max-+n.min),x=band.x+band.width/2,y=band.y+band.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+delta/extent*track.width,y,{steps:30});
}
try{
 await page.goto(base+'#trends');await page.waitForFunction(()=>window.sqbits?.trends?.aggregate);
 assert.deepEqual(await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/\/src\/graph\.js|\/assets\/graph-|\.wasm(?:[?#]|$)|HeliosSessionWorker/.test(n))),[],'The range control must not load the network renderer in design trends');
 const selector='#design-year-range';assert.equal(await page.locator(selector).getAttribute('data-engine'),'helios-two-handle-range');
 assert.equal(await page.locator('#design-yearMin').getAttribute('type'),'range');assert.equal(await page.locator('#design-yearMax').getAttribute('type'),'range');
 await setYearRange(page,2005,2015,selector);await waitTrends(2005,2015);
 await page.evaluate(()=>{window.yearBeforeDrag=window.sqbits.trends.aggregate;window.yearCoverageUpdates=0;window.yearObserver=new MutationObserver(()=>window.yearCoverageUpdates++);window.yearObserver.observe(document.querySelector('#design-coverage'),{childList:true});});
 await startBandDrag(selector,3);await page.waitForTimeout(180);
 assert.deepEqual(await values(selector),[2008,2018]);assert.equal(await page.locator(selector+' output').innerText(),'2008–2018');
 assert.equal(await page.evaluate(()=>window.sqbits.trends.aggregate===window.yearBeforeDrag),true,'No aggregation is allowed while dragging');
 assert.equal(await page.evaluate(()=>window.yearCoverageUpdates),0);
 const start=Date.now();await page.mouse.up();await waitTrends(2008,2018);const releaseToUpdateMs=Date.now()-start;
 assert.equal(await page.evaluate(()=>window.yearCoverageUpdates),1,'Apply exactly once after release');await page.evaluate(()=>window.yearObserver.disconnect());
 const band=page.locator(selector+' .helios-ui-range2__range');
 await band.press('End');await waitTrends(2016,'');assert.deepEqual(await values(selector),[2016,2026]);
 await startBandDrag(selector,30);await page.mouse.up();assert.deepEqual(await values(selector),[2016,2026],'Panning at the upper bound preserves width');
 await band.press('Home');await waitTrends('',2000);assert.deepEqual(await values(selector),[1990,2000]);
 await band.press('ArrowRight');await waitTrends(1991,2001);await band.press('Shift+ArrowRight');await waitTrends(1996,2006);
 await setYearRange(page,2010,2020,selector);await waitTrends(2010,2020);
 // Drag the real lower thumb, rather than assigning the input value.
 const track=await page.locator(selector+' .helios-ui-range2__track').boundingBox(),loX=track.x+10+20/36*(track.width-20),hiX=track.x+10+24/36*(track.width-20),y=track.y+track.height/2;
 await page.mouse.move(loX,y);await page.mouse.down();await page.mouse.move(hiX,y,{steps:20});await page.mouse.up();await waitTrends(2014,2020);
 const upperX=track.x+10+30/36*(track.width-20),newUpperX=track.x+10+28/36*(track.width-20);
 await page.mouse.move(upperX,y);await page.mouse.down();await page.mouse.move(newUpperX,y,{steps:20});await page.mouse.up();await waitTrends(2014,2018);
 await page.locator('#design-yearMax').press('ArrowRight');await page.locator('#design-yearMax').press('ArrowRight');await waitTrends(2014,2020);
 await page.locator('#design-yearMin').press('End');await waitTrends(2020,2020);assert.deepEqual(await values(selector),[2020,2020],'Handles cannot cross');
 assert.equal(await page.locator(selector+' output').innerText(),'2020');await startBandDrag(selector,-2,true);await page.mouse.up();await waitTrends(2018,2018);assert.deepEqual(await values(selector),[2018,2018],'The grip can pan a single-year interval');
 await page.locator('#design-yearMin').press('ArrowLeft');await waitTrends(2017,2018);
 await page.locator(selector+' .year-range-reset').click();await waitTrends('','');assert.deepEqual(await values(selector),[1990,2026]);
 console.log('YEAR_RANGE_MOUSE_KEYBOARD_PASSED',{releaseToUpdateMs,oneUpdatePerDrag:true});

 // A genuine touch sequence should pan the band without scrolling the page.
 await page.setViewportSize({width:390,height:844});await setYearRange(page,2010,2015,selector);await waitTrends(2010,2015);await page.locator(selector).scrollIntoViewIfNeeded();
 const mobileBand=await band.boundingBox(),mobileTrack=await page.locator(selector+' .helios-ui-range2__track').boundingBox(),cx=mobileBand.x+mobileBand.width/2,cy=mobileBand.y+mobileBand.height/2;
 const scrollY=await page.evaluate(()=>window.scrollY),cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:cy,id:1}]});
 for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx+2/36*mobileTrack.width*i/12,y:cy,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await waitTrends(2012,2017);
 assert.deepEqual(await values(selector),[2012,2017]);assert.ok(Math.abs(await page.evaluate(()=>window.scrollY)-scrollY)<=1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 mkdirSync('verification',{recursive:true});await page.locator(selector).screenshot({path:'verification/year-range-mobile.png'});
 console.log('YEAR_RANGE_TOUCH_PASSED');

 await page.setViewportSize({width:1500,height:1100});
 const before=await page.evaluate(()=>({...window.sqbits.state.designTrends.filters}));
 await startBandDrag(selector,-2);await page.evaluate(()=>document.querySelector('[data-view=timeline]').click());await page.mouse.up();
 await page.waitForFunction(()=>window.sqbits.chart?.count>0);assert.deepEqual(await page.evaluate(()=>window.sqbits.state.designTrends.filters),before,'Navigation during drag cannot commit a stale range');
 assert.equal(await page.locator('#year-range').getAttribute('data-engine'),'helios-two-handle-range');
 await setYearRange(page,2005,2015);await page.waitForFunction(()=>window.sqbits.chart?.count>0&&window.sqbits.chart.all().every(p=>p.year>=2005&&p.year<=2015));
 await page.evaluate(()=>window.yearChartBefore=window.sqbits.chart);await startBandDrag('#year-range',2);await page.waitForTimeout(180);
 assert.equal(await page.evaluate(()=>window.yearChartBefore===window.sqbits.chart),true,'Do not rebuild the timeline during a drag');
 await page.mouse.up();await page.waitForFunction(()=>window.sqbits.state.timelineFilters.yearMin===2007&&window.sqbits.chart!==window.yearChartBefore&&window.sqbits.chart.all().every(p=>p.year>=2007&&p.year<=2017));
 await page.locator('#year-range').screenshot({path:'verification/year-range-desktop.png'});console.log('YEAR_RANGE_TIMELINE_AND_TEARDOWN_PASSED');

 if(process.env.SQBITS_NETWORK_YEARS==='1'){
  await page.evaluate(()=>{for(const s of Object.values(window.sqbits.state.networks))s.running=false;});
  for(const view of ['papers','devices']){
   await page.locator(`[data-view=${view}]`).first().click();await page.waitForFunction(()=>window.sqbits.graph&&!document.querySelector('#graph-mode').disabled);
   await page.evaluate(()=>window.yearGraphInitial=window.sqbits.graph);
   await setYearRange(page,2020,2024);await page.waitForFunction(()=>window.sqbits.graph&&window.sqbits.graph===window.yearGraphInitial&&window.sqbits.graph.helios.getGraphFilter().options?.nodeQuery?.includes('2024')&&!document.querySelector('#graph-mode').disabled);
   const checkCount=async(lo,hi)=>{const counts=await page.evaluate(([lo,hi])=>{const s=window.sqbits,nodes=s.state.view==='papers'?s.papers.nodes:s.devices.nodes;return {actual:s.graph.helios.getGraphFilter().nodeCount,expected:nodes.filter(n=>n.degree>0&&n.year>=lo&&n.year<=hi).length};},[lo,hi]);assert.ok(counts.expected>0);assert.equal(counts.actual,counts.expected);};
   await checkCount(2020,2024);
   await page.evaluate(()=>window.yearGraphBefore=window.sqbits.graph);await startBandDrag('#year-range',1,true);await page.waitForTimeout(180);
   assert.equal(await page.evaluate(()=>window.sqbits.graph===window.yearGraphBefore),true,'Do not rebuild Helios during a drag');assert.deepEqual(await values('#year-range'),[2021,2025]);
   await page.mouse.up();await page.waitForFunction(()=>window.sqbits.graph&&window.sqbits.graph===window.yearGraphBefore&&window.sqbits.graph.helios.getGraphFilter().options?.nodeQuery?.includes('2025')&&!document.querySelector('#graph-mode').disabled);await checkCount(2021,2025);
   console.log('YEAR_RANGE_NETWORK_PASSED',view);
  }
 }
 assert.deepEqual(errors,[]);
}catch(error){console.error(error);mkdirSync('verification',{recursive:true});await page.screenshot({path:'verification/year-range-failure.png'}).catch(()=>{});process.exitCode=1;}finally{await browser.close();}
