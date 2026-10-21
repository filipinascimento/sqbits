import {chromium} from 'playwright';
import {existsSync,mkdirSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {homedir} from 'node:os';
const root=process.env.PLAYWRIGHT_BROWSERS_PATH||`${homedir()}/.cache/ms-playwright`;
const entries=existsSync(root)?readdirSync(root):[];
const executable=[...entries.filter(s=>/^chromium-\d+$/.test(s)).sort().map(s=>`${root}/${s}/chrome-linux64/chrome`),...entries.filter(s=>s.startsWith('chromium_headless_shell-')).sort().map(s=>`${root}/${s}/chrome-headless-shell-linux64/chrome-headless-shell`)].find(existsSync);
const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message.slice(0,1000));});
page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('CONSOLE_ERROR',m.text().slice(0,600));}});
page.on('requestfailed',r=>console.log('FAILED_REQUEST',r.url().slice(0,160),r.failure()?.errorText));
const url=process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/';
page.setDefaultTimeout(60000);
const cdp=await page.context().newCDPSession(page);
mkdirSync('verification',{recursive:true});
async function capture(name,{fullPage=false}={}){
 await page.evaluate(()=>window.scrollTo(0,0));
 if(fullPage){await page.screenshot({path:'verification/'+name,fullPage:true,timeout:60000});return;}
 // Software WebGL screenshots in headless-shell can wait indefinitely on a
 // compositor surface. Chromium's viewport capture avoids that readback path.
 const data=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:false,captureBeyondViewport:false});
 writeFileSync('verification/'+name,Buffer.from(data.data,'base64'));
}
async function positions(){
 return page.evaluate(async()=>{
  const h=window.sqbits.graph.helios,ids=h.network.withBufferAccess(()=>Array.from(h.network.nodeIndices));
  const s=await h.snapshotNodePositions(ids);let max=0,z=0;
  for(let i=0;i<s.positions.length;i++){if(!Number.isFinite(s.positions[i]))throw new Error('Non-finite layout position');max=Math.max(max,Math.abs(s.positions[i]));if(i%3===2)z=Math.max(z,Math.abs(s.positions[i]));}
  return {count:s.count,max,z,head:Array.from(s.positions.slice(0,96)),mode:h.mode(),running:window.sqbits.graph.running,type:h.behavior.layout.type()};
 });
}
async function dimension(mode){
 await page.locator('#graph-mode').selectOption(mode);
 await page.waitForFunction(m=>!document.querySelector('#graph-mode').disabled&&window.sqbits.graph.helios.mode()===m,mode,{timeout:60000});
}
async function pause(){
 if(await page.evaluate(()=>window.sqbits.graph.running))await page.locator('#layout-toggle').click();
 await page.waitForFunction(()=>!window.sqbits.graph.running&&!document.querySelector('#layout-toggle').disabled);
 assert.equal(await page.locator('#layout-toggle').innerText(),'Resume layout');
}
async function checkNativeLayout(name){
 const first=await positions();assert.equal(first.type,'gpu-force');assert.equal(first.running,true);assert.equal(first.mode,'2d');assert.equal(first.z,0);assert.ok(first.count>1000);
 await page.evaluate(()=>{window.layoutUnderTest=window.sqbits.graph.helios.layout();});
 await page.waitForFunction(async before=>{
  const s=await window.sqbits.graph.helios.snapshotNodePositions([0,1,2,3]);return Array.from(s.positions).some((v,i)=>Math.abs(v-before[i])>.01);
 },first.head,{timeout:30000});
 await dimension('3d');const three=await positions();assert.ok(three.z>0,'3D must develop real depth');assert.equal(three.running,true);
 // Regression: replacing the static engine used to reseed every node. Keep
 // the same native engine and reject a runaway expansion or NaNs instead.
 assert.ok(three.max<Math.max(500,first.max)*8,'Mode change must keep graph coordinates bounded');
 await pause();const stopped=await positions();await page.waitForTimeout(300);const still=await positions();
 assert.deepEqual(still.head,stopped.head,'Pause must freeze the layout');
 await dimension('2d');const planar=await positions();assert.equal(planar.running,false);assert.equal(planar.z,0);
 await dimension('3d');const paused3d=await positions();assert.equal(paused3d.running,false);assert.ok(paused3d.z>0);
 for(let i=0;i<planar.head.length;i++)if(i%3!==2)assert.ok(Math.abs(planar.head[i]-paused3d.head[i])<.01,'Paused dimension change must preserve XY positions');
 await page.locator('#layout-toggle').click();await page.waitForFunction(()=>window.sqbits.graph.running&&!document.querySelector('#layout-toggle').disabled);
 await page.waitForFunction(async before=>{const s=await window.sqbits.graph.helios.snapshotNodePositions([0,1,2,3]);return Array.from(s.positions).some((v,i)=>Math.abs(v-before[i])>.01);},paused3d.head);
 await dimension('2d');const resumed=await positions();assert.equal(resumed.z,0);assert.ok(resumed.max<Math.max(500,first.max)*8);
 assert.equal(await page.evaluate(()=>window.layoutUnderTest===window.sqbits.graph.helios.layout()),true,'Pause/resume and dimensions must retain the layout engine');
 console.log('NATIVE_LAYOUT',name,JSON.stringify({nodes:first.count,initialExtent:first.max,threeDExtent:three.max,depth:three.z,finalExtent:resumed.max}));
}
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#chart[data-engine="helios"]',{timeout:90000});
 console.log('CITATIONS',await page.locator('#visual-count').innerText());
 await checkNativeLayout('citations');
 await page.locator('#color').selectOption('year');await page.locator('#color').selectOption('community');
 mkdirSync('verification',{recursive:true});await capture('citations.png');
 await page.locator('[data-view="timeline"]').first().click();
 await page.waitForSelector('.outcome-dot',{timeout:60000});
 assert.equal(await page.locator('#attribution').inputValue(),'own_work');assert.equal(await page.locator('#realization').inputValue(),'measured_device');assert.equal(await page.locator('#scope').inputValue(),'individual_qubit');
 console.log('TIMELINE',await page.locator('#visual-count').innerText());
 const dot=page.locator('.outcome-dot').first();await dot.dispatchEvent('click');
 await page.waitForSelector('#inspector .observation',{timeout:30000});assert.ok(await page.locator('#selection-count').innerText());
 await page.locator('#close-inspector').click();await page.locator('#clear-selection').click();
 const box=await page.locator('.timeline-svg').boundingBox();
 await page.mouse.move(box.x+box.width*.12,box.y+box.height*.15);await page.mouse.down();
 for(const [x,y] of [[.85,.15],[.85,.8],[.12,.8],[.12,.15]])await page.mouse.move(box.x+box.width*x,box.y+box.height*y,{steps:12});
 await page.mouse.up();assert.match(await page.locator('#selection-count').innerText(),/selected/);
 console.log('LASSO',await page.locator('#selection-count').innerText());
 const dl=page.waitForEvent('download');await page.locator('#export-selection').click();assert.match((await dl).suggestedFilename(),/t1/);
 await page.locator('#metric').selectOption('t2_echo');await page.waitForFunction(()=>document.querySelector('#visual-count')?.textContent.includes('Echo coherence'));assert.ok(await page.locator('.outcome-dot').count()>0);
 await capture('performance.png');
 await page.locator('[data-view="devices"]').first().click();await page.waitForSelector('#chart[data-engine="helios"]',{timeout:90000});
 console.log('DEVICES',await page.locator('#visual-count').innerText());
 await checkNativeLayout('devices');
 // Natural cooling updates the button without turning the user's preference
 // into a manual pause for every subsequent filtered graph.
 await page.evaluate(()=>window.sqbits.graph.helios.stopLayout('alpha-min'));
 assert.equal(await page.locator('#layout-toggle').innerText(),'Resume layout');
 assert.equal(await page.evaluate(()=>window.sqbits.state.networks.devices.running),true);
 await page.locator('#layout-toggle').click();
 await pause();await dimension('3d');
 await page.locator('#type').selectOption('fluxonium');await page.waitForFunction(()=>document.querySelector('#visual-count')?.textContent.includes('records')&&document.querySelector('#chart')?.dataset.engine==='helios');
 assert.equal(await page.locator('#graph-mode').inputValue(),'3d');assert.equal(await page.evaluate(()=>window.sqbits.graph.helios.mode()),'3d');assert.equal(await page.evaluate(()=>window.sqbits.graph.running),false);
 await capture('devices.png');
 // Queue dimension requests, then leave the view during a GPU handoff.
 await page.evaluate(async()=>{const g=window.sqbits.graph;await Promise.all([g.mode('2d'),g.mode('3d'),g.mode('2d')]);});
 assert.equal(await page.evaluate(()=>window.sqbits.graph.helios.mode()),'2d');
 assert.equal(await page.evaluate(()=>window.sqbits.graph.running),false);
 await page.evaluate(async()=>{const changing=window.sqbits.graph.mode('3d');await Promise.resolve();document.querySelector('[data-view="guide"]').click();await changing;});
 await page.waitForSelector('.schematic svg');
 await page.locator('.topic-button[data-topic="6"]').click();assert.match(await page.locator('#anatomy-detail').innerText(),/Fabrication process/);
 await capture('guide.png',{fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await capture('mobile.png');
 assert.deepEqual(errors,[]);console.log('BROWSER_CHECKS_PASSED');
}catch(e){console.log('FAILURE',e.message);console.log((await page.locator('#chart').innerText().catch(()=>page.locator('body').innerText())).slice(0,1600));await page.screenshot({path:'verification/failure.png',fullPage:false}).catch(()=>{});process.exitCode=1;}finally{await browser.close();}
