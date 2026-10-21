import {chromium} from 'playwright';import {readdirSync,existsSync,mkdirSync} from 'node:fs';import {homedir} from 'node:os';import assert from 'node:assert/strict';
const root=homedir()+'/.cache/ms-playwright',executablePath=readdirSync(root).filter(n=>/^chromium-\d+$/.test(n)).sort().map(n=>`${root}/${n}/chrome-linux64/chrome`).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const base=(process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/').split('#')[0];mkdirSync('verification',{recursive:true});
async function independentScroll(center){
 const state=await page.evaluate(sel=>{const c=document.querySelector(sel),side=document.querySelector('.selection-panel'),filters=document.querySelector('.filters-panel');c.scrollTop=0;if(filters)filters.scrollTop=0;return {height:c.clientHeight,scrollHeight:c.scrollHeight,side:side.getBoundingClientRect().top,filters:filters?.getBoundingClientRect().top};},center);assert.ok(state.scrollHeight>state.height);
 await page.locator(center).hover({position:{x:100,y:150}});await page.mouse.wheel(0,750);await page.waitForTimeout(250);
 const after=await page.evaluate(sel=>({scroll:document.querySelector(sel).scrollTop,page:scrollY,side:document.querySelector('.selection-panel').getBoundingClientRect().top,filters:document.querySelector('.filters-panel')?.scrollTop||0}),center);
 assert.ok(after.scroll>0);assert.equal(after.page,0);assert.equal(after.side,state.side);assert.equal(after.filters,0);
}
try{
 await page.goto(base+'#trends');await page.waitForFunction(()=>window.sqbits?.trends?.aggregate);await page.waitForSelector('.part-distribution');assert.equal(await page.locator('.part-distribution').count(),9);
 await independentScroll('.design-trend-panels');
 const field=page.locator('[data-part-field="materials"]');await field.selectOption('numeric:film_thickness:m');const hist=page.locator('[data-part-chart="materials"] .numeric-histogram');await hist.locator('rect').first().waitFor();assert.match(await page.locator('[data-part-chart="materials"]').innerText(),/m · (logarithmic bins · )?An entry counts once/);
 await hist.locator('rect').first().click();await page.waitForSelector('#selection-list .selected-device');assert.ok(await page.locator('#selection-list .selected-device').count()>0);
 await page.screenshot({path:'verification/design-numeric-distributions.png'});
 await page.locator('[data-view=guide]').first().click();await page.waitForSelector('#guide-distributions .part-distribution');assert.equal(await page.locator('#guide-distributions .part-distribution').count(),9);await independentScroll('.guide-content');
 await page.locator('.topic-button[data-topic="2"]').click();assert.equal(await page.locator('.part-focused[data-family=junction]').count(),1);await page.locator('[data-part-chart="junction"] [data-part-bin]').first().click();await page.waitForSelector('#selection-list .selected-device');
 await page.locator('.selected-device-title').first().click();await page.waitForSelector('#inspector .device-design-content');assert.equal(await page.locator('.download-device-record').count(),0);assert.ok(await page.locator('#inspector .design-family .observation[open]').count()>0);
 await page.locator('.guide-content').evaluate(e=>e.scrollTop=0);await page.screenshot({path:'verification/compact-guide.png'});
 await page.locator('.dataset-statistics > summary').click();assert.equal(await page.locator('.stats-strip').isVisible(),true);await page.locator('.dataset-statistics > summary').click();
 for(const view of ['trends','guide','timeline']){await page.locator(`[data-view=${view}]`).first().click();await page.waitForTimeout(350);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.equal(await page.evaluate(()=>scrollY),0);await page.screenshot({path:`verification/compact-${view}-mobile.png`});await page.setViewportSize({width:1600,height:1000});}
 assert.deepEqual(errors,[]);console.log('COMPACT_PANES_AND_DESIGN_HISTOGRAMS_PASSED');
}catch(e){console.error(e);await page.screenshot({path:'verification/interface-layout-failure.png'}).catch(()=>{});process.exitCode=1;}finally{await browser.close();}
