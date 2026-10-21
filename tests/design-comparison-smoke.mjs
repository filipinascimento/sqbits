import {chromium} from 'playwright';
import {existsSync,readdirSync,mkdirSync,readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';
import {csvParse} from 'd3';
import {setYearRange} from './year-range-helpers.mjs';

const cache=homedir()+'/.cache/ms-playwright';
const executablePath=readdirSync(cache).filter(n=>/^chromium-\d+$/.test(n)).sort().map(n=>`${cache}/${n}/chrome-linux64/chrome`).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
const base=(process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/').split('#')[0];
mkdirSync('verification',{recursive:true});

async function checkBars(){
 const result=await page.evaluate(()=>{
  const a=window.sqbits.trends.aggregate,mode=document.querySelector('#design-value-mode').value;
  return [...document.querySelectorAll('.design-overall-bar')].map(bar=>{
   const row=a.counts.find(r=>r.category===bar.dataset.category),count=row?.count||0,share=a.denominator?count/a.denominator*100:null;
   return {category:bar.dataset.category,count:+bar.dataset.count,expectedCount:count,share:bar.dataset.share===''?null:+bar.dataset.share,expectedShare:share,value:bar.dataset.value===''?null:+bar.dataset.value,expectedValue:mode==='count'?count:share};
  });
 });
 assert.ok(result.length>0);
 for(const r of result){assert.equal(r.count,r.expectedCount);assert.equal(r.share,r.expectedShare);assert.equal(r.value,r.expectedValue);}
 assert.deepEqual(await page.locator('.design-share-line').evaluateAll(lines=>lines.map(l=>l.dataset.category)),result.map(r=>r.category));
 return result;
}

try{
 await page.goto(base+'#trends');await page.waitForFunction(()=>window.sqbits?.trends?.aggregate);
 assert.equal(await page.locator('.filters-panel #category-search').count(),1);
 assert.equal(await page.locator('.visual-column [data-plot-category]').count(),0);
 assert.equal(await page.locator('.filters-panel').evaluate(e=>getComputedStyle(e).borderRadius),'0px');
 assert.equal(await page.locator('#design-field').evaluate(e=>getComputedStyle(e).borderWidth),'0px');
 const time=await page.locator('#design-time-chart').boundingBox(),overall=await page.locator('#design-overall-chart').boundingBox();
 assert.ok(time.x>overall.x+overall.width-2,'The distribution must sit beside the sidebar, with the yearly plot to its right');assert.ok(Math.abs(overall.y-time.y)<2);
 const before=await page.evaluate(()=>window.sqbits.trends.aggregate.total);
 await page.locator('#category-search').fill('bandaid');await page.locator('[data-search-field="patch_bandaid"]').waitFor();
 assert.equal(await page.evaluate(()=>window.sqbits.trends.aggregate.total),before,'Searching fields does not filter the population');
 await page.locator('[data-search-field="patch_bandaid"]').click();await page.waitForFunction(()=>window.sqbits.trends.aggregate.field==='patch_bandaid');
 await checkBars();assert.equal(await page.locator('#category-search').inputValue(),'bandaid');
 await page.locator('#category-search').fill('');await page.waitForFunction(()=>document.querySelector('#design-field-results').hidden);
 await page.locator('#design-field').selectOption('fabrication_operation');await page.waitForFunction(()=>window.sqbits.trends.aggregate.field==='fabrication_operation');
 const all=await checkBars();const box=page.locator('[data-plot-category]:checked').first(),removed=await box.getAttribute('data-plot-category');await box.uncheck();
 assert.equal((await checkBars()).length,all.length-1);assert.equal(await page.locator('.design-overall-bar').evaluateAll((bars,c)=>bars.filter(b=>b.dataset.category===c).length,removed),0);
 await page.locator(`[data-plot-category="${removed}"]`).check();await checkBars();
 await page.locator('#design-unit').selectOption('papers');await page.waitForFunction(()=>window.sqbits.trends.aggregate.unit==='papers');await checkBars();
 await page.locator('#design-denominator').selectOption('reporting');await page.waitForFunction(()=>window.sqbits.trends.aggregate.denominatorBasis==='reporting');await checkBars();
 await page.locator('#design-value-mode').selectOption('count');await checkBars();
 await setYearRange(page,2015,2023,'#design-year-range');await page.waitForFunction(()=>window.sqbits.trends.aggregate.population.yearMin===2015);await checkBars();
 const download=page.waitForEvent('download');await page.locator('#export-design-breakdown').click();
 const csv=csvParse(readFileSync(await (await download).path(),'utf8')),plotted=await checkBars();
 assert.deepEqual(csv.map(r=>r.category),plotted.map(r=>r.category));assert.deepEqual(csv.map(r=>+r.count),plotted.map(r=>r.count));
 const bar=page.locator('.design-overall-bar').first();await bar.focus();await bar.press('Enter');
 const drilldown=await page.evaluate(()=>{const s=window.sqbits,a=s.trends.aggregate,category=document.querySelector('.design-overall-bar').dataset.category;return {records:s.trends.selected.length,papers:new Set(s.trends.selected.map(i=>s.devices.nodes[i].paper)).size,expected:a.counts.find(r=>r.category===category).count};});
 assert.ok(drilldown.records>0);assert.equal(drilldown.papers,drilldown.expected);await page.locator('#selection-list .selected-device').first().waitFor();
 // A sidebar scroll cannot move either the chart or the evidence pane.
 await page.locator('.filters-panel').evaluate(e=>e.scrollTop=0);
 const panes=await page.evaluate(()=>({center:document.querySelector('.visual-column').scrollTop,right:document.querySelector('.selection-list').scrollTop}));
 await page.locator('.filters-panel').hover({position:{x:100,y:150}});await page.mouse.wheel(0,500);await page.waitForTimeout(150);
 assert.ok(await page.locator('.filters-panel').evaluate(e=>e.scrollTop)>0);
 assert.deepEqual(await page.evaluate(()=>({center:document.querySelector('.visual-column').scrollTop,right:document.querySelector('.selection-list').scrollTop})),panes);
 await page.locator('.filters-panel').evaluate(e=>e.scrollTop=0);await page.locator('.visual-column').evaluate(e=>e.scrollTop=0);
 await page.screenshot({path:'verification/design-comparison-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 const mobile=await page.locator('#design-overall-chart').boundingBox(),yearly=await page.locator('#design-time-chart').boundingBox();assert.ok(yearly.y>=mobile.y+mobile.height,'Narrow panes must stack the plots, with the distribution first');
 await checkBars();await page.screenshot({path:'verification/design-comparison-mobile.png'});
 await page.setViewportSize({width:1600,height:1000});
 while(await page.locator('[data-plot-category]:checked').count())await page.locator('[data-plot-category]:checked').first().uncheck();
 assert.equal(await page.locator('.design-overall-bar,.design-share-line').count(),0);assert.equal(await page.locator('#export-design-breakdown').isDisabled(),true);
 await setYearRange(page,2020,2023,'#design-year-range');await page.waitForFunction(()=>window.sqbits.trends.aggregate.population.yearMin===2020);
 assert.equal(await page.locator('.design-overall-bar').count(),0,'An empty series selection must stay empty after population filtering');
 assert.deepEqual(errors,[]);console.log('SEARCHABLE_SIDEBAR_AND_PAIRED_DESIGN_PLOTS_PASSED',drilldown);
}catch(error){console.error(error);await page.screenshot({path:'verification/design-comparison-failure.png'}).catch(()=>{});process.exitCode=1;}finally{await browser.close();}
