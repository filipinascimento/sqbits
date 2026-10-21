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
page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE_ERROR',m.text().slice(0,600));});
page.on('requestfailed',r=>console.log('FAILED_REQUEST',r.url().slice(0,160),r.failure()?.errorText));
const url=process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/';
const cdp=await page.context().newCDPSession(page);
async function capture(name,{fullPage=false}={}){
 await page.evaluate(()=>window.scrollTo(0,0));
 if(fullPage){await page.screenshot({path:'verification/'+name,fullPage:true,timeout:60000});return;}
 // Software WebGL screenshots in headless-shell can wait indefinitely on a
 // compositor surface. Chromium's viewport capture avoids that readback path.
 const data=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:false,captureBeyondViewport:false});
 writeFileSync('verification/'+name,Buffer.from(data.data,'base64'));
}
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#chart[data-engine="helios"]',{timeout:90000});
 console.log('CITATIONS',await page.locator('#visual-count').innerText());
 const positionCheck=await page.evaluate(async()=>{const got=await window.sqbits.graph.helios.snapshotNodePositions([0,1,2]);const expected=window.sqbits.papers.nodes.filter(n=>n.degree>0).slice(0,3);return expected.every((n,i)=>Math.abs(n.x-got.positions[i*3])<.002&&Math.abs(n.y-got.positions[i*3+1])<.002);});assert.equal(positionCheck,true,'The rendered coordinates must use the precomputed graph layout');
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
 await page.locator('#type').selectOption('fluxonium');await page.waitForFunction(()=>document.querySelector('#visual-count')?.textContent.includes('records')&&document.querySelector('#chart')?.dataset.engine==='helios');
 await capture('devices.png');
 await page.locator('[data-view="guide"]').first().click();await page.waitForSelector('.schematic svg');
 await page.locator('.topic-button[data-topic="6"]').click();assert.match(await page.locator('#anatomy-detail').innerText(),/Fabrication process/);
 await capture('guide.png',{fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await capture('mobile.png');
 assert.deepEqual(errors,[]);console.log('BROWSER_CHECKS_PASSED');
}catch(e){console.log('FAILURE',e.message);console.log((await page.locator('#chart').innerText().catch(()=>page.locator('body').innerText())).slice(0,1600));await page.screenshot({path:'verification/failure.png',fullPage:false}).catch(()=>{});process.exitCode=1;}finally{await browser.close();}
