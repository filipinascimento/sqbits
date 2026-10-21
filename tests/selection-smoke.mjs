import {chromium} from 'playwright';
import {existsSync,mkdirSync,readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';
const root=process.env.PLAYWRIGHT_BROWSERS_PATH||`${homedir()}/.cache/ms-playwright`;
const executable=readdirSync(root).filter(n=>/^chromium-\d+$/.test(n)).sort().map(n=>`${root}/${n}/chrome-linux64/chrome`).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];
page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const url=(process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/').split('#')[0];
try{
 await page.goto(url+'#timeline');await page.waitForFunction(()=>window.sqbits?.chart);
 assert.equal(await page.locator('#selection-list .selected-paper').count(),0);
 assert.equal(await page.locator('.selection-table,.browse-panel').count(),0);
 const positions=await page.evaluate(()=>{const chart=window.sqbits.chart,svg=document.querySelector('.timeline-svg'),matrix=svg.getScreenCTM();let first,second;
 const candidates=chart.all().filter(p=>p.eligible).sort((a,b)=>a.value-b.value);
 for(const p of candidates){const [x,y]=chart.position(p),others=candidates.filter(q=>{if(q===p)return false;const [a,b]=chart.position(q);return Math.hypot(x-a,y-b)<9;});if(others.length)continue;const pt=new DOMPoint(x,y).matrixTransform(matrix),item={x:pt.x,y:pt.y,paper:window.sqbits.devices.nodes[p.device].paper};if(!first)first=item;else if(item.paper!==first.paper){second=item;break;}}
 if(!second)throw Error('Need two independently pickable source papers');return [first,second];});
 await page.mouse.click(positions[0].x,positions[0].y);
 assert.equal(await page.locator('#selection-list .selected-paper').count(),1);assert.equal(await page.locator('#selection-list .selected-device').count(),1);
 assert.match(await page.locator('#selection-count').innerText(),/1 observation selected/);
 assert.equal(await page.locator('#inspector.open').count(),0,'Selecting a point must show the list first');
 const pane=await page.locator('#selection-panel').boundingBox(),plot=await page.locator('.visual-column').boundingBox();assert.ok(pane.x>=plot.x+plot.width-1,'Selection must be beside the chart');
 await page.keyboard.down('Shift');await page.mouse.click(positions[1].x,positions[1].y);await page.keyboard.up('Shift');
 assert.equal(await page.locator('#selection-list .selected-paper').count(),2);assert.equal(await page.locator('#selection-list .selected-device').count(),2);
 mkdirSync('verification',{recursive:true});await page.locator('.explorer-layout').screenshot({path:'verification/selection-layout.png'});
 await page.locator('#selection-list .selected-device-title').first().click();await page.waitForSelector('#inspector .observation');
 assert.equal(await page.locator('#inspector').evaluate(el=>getComputedStyle(el).position),'static','Details must stay in the side panel');
 await page.locator('#close-inspector').click();assert.equal(await page.locator('#selection-list .selected-paper').count(),2);
 await page.locator('#selection-list h4 button[data-paper]').first().click();await page.waitForSelector('#inspector .inspector-entry');await page.locator('#close-inspector').click();
 await page.locator('#clear-panel-selection').click();assert.equal(await page.locator('#selection-list .selected-paper').count(),0);
 const box=await page.locator('.timeline-svg').boundingBox();
 await page.mouse.move(box.x+box.width*.22,box.y+box.height*.15);await page.mouse.down();
 for(const [x,y] of [[.85,.15],[.85,.8],[.22,.8],[.22,.15]])await page.mouse.move(box.x+box.width*x,box.y+box.height*y,{steps:8});
 await page.mouse.up();assert.ok(await page.locator('#selection-list .selected-paper').count()>1);assert.equal(await page.locator('#inspector.open').count(),0);
 const actual=await page.evaluate(()=>{const all=window.sqbits.chart.all(),selected=window.sqbits.chart.selected(),dev=new Set(selected.map(p=>p.device)),papers=new Set([...dev].map(i=>window.sqbits.devices.nodes[i].paper));return {observations:selected.length,devices:dev.size,papers:papers.size};});
 assert.match(await page.locator('#selection-count').innerText(),new RegExp(actual.observations.toLocaleString('en-US')+' observations'));
 assert.match(await page.locator('#selection-totals').innerText(),new RegExp(actual.papers.toLocaleString('en-US')+' papers'));
 if(await page.locator('#more-selected-papers').count()){const count=await page.locator('.selected-paper').count();await page.locator('#more-selected-papers').click();assert.ok(await page.locator('.selected-paper').count()>count);}
 const download=page.waitForEvent('download');await page.locator('#export-selection').click();const csv=await download;assert.match(csv.suggestedFilename(),/t1/);
 mkdirSync('verification',{recursive:true});await page.locator('#selection-panel').screenshot({path:'verification/selection-panel.png'});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.locator('#selection-panel').scrollIntoViewIfNeeded();await page.screenshot({path:'verification/selection-mobile.png'});
 await page.setViewportSize({width:1500,height:1100});await page.locator('#metric').selectOption('t2_echo');await page.waitForFunction(()=>document.querySelector('#visual-count').textContent.includes('Echo coherence'));
 assert.equal(await page.locator('#selection-list .selected-paper').count(),0,'Changing the metric must clear stale selections');
 console.log('TIMELINE_SELECTION_PASSED',actual);
 if(process.env.SQBITS_TIMELINE_ONLY==='1'){assert.deepEqual(errors,[]);process.exitCode=0;}else{
 // Pause physics to exercise the real Helios selection API without a live
 // layout competing with software rendering during these interaction checks.
 await page.evaluate(()=>{window.sqbits.state.networks.devices.running=false;window.sqbits.state.networks.papers.running=false;});
 await page.locator('[data-view="devices"]').first().click();await page.waitForSelector('#chart[data-engine="helios"]');
 await page.evaluate(()=>window.sqbits.graph.helios.behavior.selection.selectNodes([0,1],{mode:'replace'}));
 await page.waitForFunction(()=>document.querySelector('#selection-count').textContent==='2 device records selected');
 assert.ok(await page.locator('#selection-list .selected-device').count()>=2);
 await page.locator('#color').selectOption('year');assert.match(await page.locator('#selection-count').innerText(),/2 device records selected/);
 await page.locator('#clear-panel-selection').click();await page.waitForFunction(()=>document.querySelector('#selection-count').textContent==='No entries selected');
 await page.evaluate(()=>window.sqbits.graph.helios.behavior.selection.selectNodes([0]));
 await page.waitForFunction(()=>document.querySelector('#selection-count').textContent==='1 device record selected');
 await page.evaluate(()=>{const h=window.sqbits.graph.helios;h.emit('graph:click',{kind:'edge',index:0,modifiers:{shiftKey:false}});h.emit('edge:click',{index:0});});
 await page.waitForSelector('#inspector.open');assert.match(await page.locator('#inspector-content').innerText(),/IDF-weighted Jaccard/);await page.locator('#close-inspector').click();
 await page.locator('[data-view="papers"]').first().click();await page.waitForSelector('#chart[data-engine="helios"]');
 await page.evaluate(()=>window.sqbits.graph.helios.emit('graph:click',{kind:'node',index:0,modifiers:{shiftKey:false}}));
 await page.waitForFunction(()=>document.querySelector('#selection-count').textContent==='1 paper selected');
 await page.evaluate(()=>window.sqbits.graph.helios.emit('graph:click',{kind:'node',index:1,modifiers:{shiftKey:true}}));
 await page.waitForFunction(()=>document.querySelector('#selection-count').textContent==='2 papers selected');
 assert.equal(await page.locator('#selection-list .selected-paper').count(),2);
 await page.locator('#clear-panel-selection').click();await page.waitForFunction(()=>document.querySelector('#selection-count').textContent==='No entries selected');
 assert.deepEqual(errors,[]);console.log('NETWORK_SELECTION_CHECKS_PASSED');}
}catch(error){console.error(error);await page.screenshot({path:'verification/selection-failure.png'}).catch(()=>{});process.exitCode=1;}finally{await browser.close();}
