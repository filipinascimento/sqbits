import {chromium} from 'playwright';import {existsSync,readdirSync,mkdirSync} from 'node:fs';import {homedir} from 'node:os';import assert from 'node:assert/strict';
import {setYearRange} from './year-range-helpers.mjs';
const root=homedir()+'/.cache/ms-playwright',executablePath=readdirSync(root).filter(n=>/^chromium-\d+$/.test(n)).sort().map(n=>`${root}/${n}/chrome-linux64/chrome`).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
const base=(process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/').split('#')[0];mkdirSync('verification',{recursive:true});
async function styles(){return page.locator('.design-share-line').evaluateAll(lines=>lines.map(line=>({category:line.dataset.category,color:line.getAttribute('stroke'),dash:line.getAttribute('stroke-dasharray')||''})));}
async function check(){
 const series=await styles();assert.equal(new Set(series.map(s=>s.color)).size,series.length);
 const matches=await page.evaluate(()=>Array.from(document.querySelectorAll('.design-share-line')).every(line=>{
  const category=line.dataset.category,legend=Array.from(document.querySelectorAll('#design-series-legend>span')).find(e=>e.dataset.category===category),row=Array.from(document.querySelectorAll('[data-plot-category]')).find(e=>e.dataset.plotCategory===category)?.closest('tr'),points=Array.from(document.querySelectorAll('.design-share-point')).filter(p=>p.dataset.category===category);
  return legend?.querySelector('path').getAttribute('stroke')===line.getAttribute('stroke')&&(legend.querySelector('path').getAttribute('stroke-dasharray')||'')===(line.getAttribute('stroke-dasharray')||'')&&points.every(p=>p.getAttribute('fill')===line.getAttribute('stroke'))&&(!row||getComputedStyle(row.querySelector('.category-color')).backgroundColor===getComputedStyle(line).stroke);
 }));assert.ok(matches,'Plot, points, legend and table must agree');return series;
}
try{
 await page.goto(base+'#trends');await page.waitForFunction(()=>window.sqbits?.trends?.aggregate);
 await page.locator('#design-field').selectOption('fabrication_operation');await page.waitForFunction(()=>window.sqbits.trends.aggregate.field==='fabrication_operation');
 const first=await check();assert.ok(first.some(s=>s.category==='lithography'));assert.ok(first.some(s=>s.category==='lift_off'));assert.ok(new Set(first.map(s=>s.dash)).size>1);
 await setYearRange(page,1999,2025,'#design-year-range');await page.waitForFunction(()=>window.sqbits.trends.aggregate.population.yearMin===1999);assert.deepEqual(await check(),first,'Year filters must not recolor selected series');
 await page.locator('#design-unit').selectOption('papers');await page.waitForFunction(()=>window.sqbits.trends.aggregate.unit==='papers');assert.deepEqual(await check(),first);
 await page.locator('#design-time-chart').scrollIntoViewIfNeeded();await page.locator('#design-time-chart').locator('..').screenshot({path:'verification/fabrication-colors.png'});
 await page.locator('#category-top').selectOption('12');const top=await check();assert.ok(top.length>6);assert.equal(top.length,Math.min(12,await page.evaluate(()=>window.sqbits.trends.aggregate.counts.length)));
 const box=page.locator('[data-plot-category]').filter({visible:true});
 const checked=page.locator('[data-plot-category]:checked');const removed=await checked.first().getAttribute('data-plot-category');const kept=top.filter(s=>s.category!==removed);await checked.first().uncheck();assert.deepEqual(await check(),kept);
 await page.locator(`[data-plot-category="${removed}"]`).check();await check();
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await check();assert.deepEqual(errors,[]);
 console.log('DISTINCT_HIGH_CONTRAST_SERIES_PASSED',{defaultSeries:first.length,maxSeries:top.length,stableAcrossYearAndCountingFilters:true});
}catch(e){console.error(e);await page.screenshot({path:'verification/chart-colors-failure.png'}).catch(()=>{});process.exitCode=1;}finally{await browser.close();}
