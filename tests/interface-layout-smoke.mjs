import {chromium} from 'playwright';import {readdirSync,existsSync,mkdirSync} from 'node:fs';import {homedir} from 'node:os';import assert from 'node:assert/strict';
import {setYearRange} from './year-range-helpers.mjs';
const root=homedir()+'/.cache/ms-playwright',executablePath=readdirSync(root).filter(n=>/^chromium-\d+$/.test(n)).sort().map(n=>`${root}/${n}/chrome-linux64/chrome`).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const base=(process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/').split('#')[0];mkdirSync('verification',{recursive:true});
async function independentScroll(center){
 const state=await page.evaluate(sel=>{const c=document.querySelector(sel),side=document.querySelector('.selection-panel'),filters=document.querySelector('.filters-panel');c.scrollTop=0;if(filters)filters.scrollTop=0;return {height:c.clientHeight,scrollHeight:c.scrollHeight,side:side.getBoundingClientRect().top,filters:filters?.getBoundingClientRect().top};},center);assert.ok(state.scrollHeight>state.height);
 // Use the pane heading, rather than a distribution's independently scrolling bars.
 await page.locator(center).hover({position:{x:30,y:20}});await page.mouse.wheel(0,750);await page.waitForTimeout(250);
 const after=await page.evaluate(sel=>({scroll:document.querySelector(sel).scrollTop,page:scrollY,side:document.querySelector('.selection-panel').getBoundingClientRect().top,filters:document.querySelector('.filters-panel')?.scrollTop||0}),center);
 assert.ok(after.scroll>0);assert.equal(after.page,0);assert.equal(after.side,state.side);assert.equal(after.filters,0);
}
try{
 await page.goto(base+'#trends');await page.waitForFunction(()=>window.sqbits?.trends?.aggregate);assert.equal(await page.locator('#part-distributions').count(),0);
 await independentScroll('.design-trend-panels');
 const field=page.locator('#design-field');await page.locator('#category-search').fill('film thickness');await page.locator('[data-search-field="numeric:film_thickness:m"]').click();const hist=page.locator('[data-part-chart="materials"] .numeric-histogram');await hist.locator('rect').first().waitFor();assert.match(await page.locator('[data-part-chart="materials"]').innerText(),/m · (logarithmic bins · )?An entry counts once/);
 assert.equal(await page.locator('.design-trend-panels').evaluate(e=>e.scrollTop),0,'Changing the main selector must reveal its distribution immediately');assert.ok(await page.evaluate(()=>window.sqbits.trends.aggregate.reporting)>0);assert.equal(await page.locator('#design-category-controls').isVisible(),false);
 await hist.locator('rect').first().click();await page.waitForSelector('#selection-list .selected-device');assert.ok(await page.locator('#selection-list .selected-device').count()>0);
 await page.screenshot({path:'verification/design-numeric-distributions.png'});
 await page.locator('#design-unit').selectOption('papers');await page.waitForFunction(()=>window.sqbits.trends.aggregate.unit==='papers');await hist.locator('rect').first().click();
 assert.equal(await page.evaluate(()=>new Set(window.sqbits.trends.selected.map(i=>window.sqbits.devices.nodes[i].paper)).size),await hist.locator('rect').first().evaluate(r=>r.__data__.count),'A numeric bin must union matching devices when counting papers');
 await setYearRange(page,2015,2023,'#design-year-range');await page.waitForFunction(()=>window.sqbits.trends.aggregate.population.yearMin===2015);
 assert.ok(await hist.locator('rect').evaluateAll(rects=>rects.every(r=>r.__data__.rows.every(row=>{const y=window.sqbits.devices.nodes[row.index].year;return y>=2015&&y<=2023;}))));
 await page.locator('#design-search').fill('zz-no-matching-record');await page.waitForFunction(()=>window.sqbits.trends.aggregate.total===0);assert.match(await hist.innerText(),/No converted point values/);
 await page.locator('#reset-design-population').click();await page.waitForFunction(()=>window.sqbits.trends.aggregate.reporting>0);await hist.locator('rect').first().waitFor();
 await field.selectOption('material_family');await page.waitForFunction(()=>window.sqbits.trends.aggregate.field==='material_family');assert.equal(await page.locator('#design-numeric-distribution').isVisible(),false);assert.ok(await page.locator('.design-overall-bar').count()>0);
 await page.locator('[data-view=guide]').first().click();await page.waitForSelector('#guide-distributions .part-distribution:visible');assert.equal(await page.locator('#guide-distributions .part-distribution:visible').count(),1);
 const schematic=await page.locator('.schematic svg').boundingBox(),distribution=await page.locator('.part-distribution:visible').boundingBox();
 assert.ok(distribution.x>=schematic.x+schematic.width,'The distribution must sit to the right of the smaller schematic');assert.ok(schematic.width<=440);assert.ok(distribution.y<schematic.y+schematic.height,'Figure and distribution must share the same visible row');assert.ok(distribution.y+distribution.height<1000);
 await page.screenshot({path:'verification/guide-schematic-and-distribution.png'});await independentScroll('.guide-content');
 await page.locator('.part-property-search').fill('film thickness');await page.locator('[data-design-property="numeric:film_thickness:m"]').click();assert.equal(await page.locator('.part-distribution:visible').count(),1);await page.locator('.part-distribution:visible .numeric-histogram rect').first().waitFor();
 const chooser=await page.locator('.design-property-selector').boundingBox(),plot=await page.locator('.part-distribution:visible').boundingBox();assert.ok(plot.x>=chooser.x+chooser.width,'The selected distribution must sit beside its property selector');assert.ok(Math.abs(plot.y-chooser.y)<2);
 await page.locator('#guide-distributions').screenshot({path:'verification/guide-selected-property.png'});
 await page.locator('.topic-button[data-topic="2"]').click();assert.equal(await page.locator('.part-focused[data-family=junction]').count(),1);await page.locator('[data-part-chart="junction"] [data-part-bin]').first().click();await page.waitForSelector('#selection-list .selected-device');
 assert.equal(await page.locator('.part-property-search').inputValue(),'');assert.equal(await page.locator('[data-design-property="junction_stack"]').getAttribute('aria-pressed'),'true');
 await page.locator('.selected-device-title').first().click();await page.waitForSelector('#inspector .device-design-content');assert.equal(await page.locator('.download-device-record').count(),0);assert.ok(await page.locator('#inspector .design-family .observation[open]').count()>0);
 await page.locator('.guide-content').evaluate(e=>e.scrollTop=0);await page.screenshot({path:'verification/compact-guide.png'});
 await page.locator('.dataset-statistics > summary').click();assert.equal(await page.locator('.stats-strip').isVisible(),true);await page.locator('.dataset-statistics > summary').click();
 for(const view of ['trends','guide','timeline']){await page.locator(`[data-view=${view}]`).first().click();await page.waitForTimeout(350);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.equal(await page.evaluate(()=>scrollY),0);await page.screenshot({path:`verification/compact-${view}-mobile.png`});await page.setViewportSize({width:1600,height:1000});}
 assert.deepEqual(errors,[]);console.log('COMPACT_PANES_AND_DESIGN_HISTOGRAMS_PASSED');
}catch(e){console.error(e);await page.screenshot({path:'verification/interface-layout-failure.png'}).catch(()=>{});process.exitCode=1;}finally{await browser.close();}
