import {chromium} from 'playwright';
import {existsSync,mkdirSync,readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';

const root=process.env.PLAYWRIGHT_BROWSERS_PATH||`${homedir()}/.cache/ms-playwright`;
const entries=existsSync(root)?readdirSync(root):[];
const executable=entries.filter(s=>/^chromium-\d+$/.test(s)).sort().map(s=>`${root}/${s}/chrome-linux64/chrome`).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const url=process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/';
page.setDefaultTimeout(30000);
async function readAxis(){
 return page.evaluate(()=>{
  const dots=[...document.querySelectorAll('.outcome-dot')],years=dots.map(d=>d.__data__.year),ticks=[...document.querySelectorAll('.x-axis .tick text')].map(n=>Number(n.textContent));
  const first=dots[0],other=dots.find(d=>d.__data__.year!==first?.__data__.year),rect=document.querySelector('#plot-clip rect');let visible;
  if(other){const year=first.__data__.year,x=+first.getAttribute('cx'),slope=(+other.getAttribute('cx')-x)/(other.__data__.year-year),left=+rect.getAttribute('x');visible=[year+(left-x)/slope,year+(left+ +rect.getAttribute('width')-x)/slope];}
  return {min:Math.min(...years),max:Math.max(...years),ticks,visible,head:dots.slice(0,10).map(d=>+d.getAttribute('cx')),count:dots.length};
 });
}
async function checkBounds(stage){
 const axis=await readAxis();
 assert.ok(axis.count>0);assert.equal(new Set(axis.ticks).size,axis.ticks.length,'Year labels must not repeat');
 assert.ok(axis.ticks.every(y=>Number.isInteger(y)&&y>=axis.min&&y<=axis.max),stage+': year ticks must stay within the data');
 if(axis.visible){assert.ok(axis.visible[0]>=axis.min-.5,stage+': no extra historical years');assert.ok(axis.visible[1]<=axis.max+.5,stage+': no empty future years');}
 return axis;
}
async function dragAcross(reverse=false){
 const b=await page.locator('.timeline-svg').boundingBox(),y=b.y+b.height*.5;
 await page.mouse.move(b.x+b.width*(reverse?.15:.9),y);await page.mouse.down();await page.mouse.move(b.x+b.width*(reverse?.9:.15),y,{steps:8});await page.mouse.up();
}
try{
 await page.goto(url.split('#')[0]+'#timeline',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.sqbits?.chart&&document.querySelectorAll('.outcome-dot').length>0);
 const initial=await checkBounds('Initial view');assert.equal(initial.max,2025);assert.equal(initial.ticks.at(-1),initial.max,'The latest data year must be labelled');
 const box=await page.locator('.timeline-svg').boundingBox();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.5);
 await page.mouse.wheel(0,2000);await page.waitForTimeout(250);
 const out=await checkBounds('Zoom out');assert.deepEqual(out.head,initial.head,'Zoom out must stop at the complete data view');
 await page.locator('#pan-mode').click();await dragAcross();await checkBounds('Pan at full extent');assert.deepEqual((await readAxis()).head,initial.head);
 await page.mouse.wheel(0,-1000);await page.waitForTimeout(250);assert.notDeepEqual((await readAxis()).head,initial.head,'Zoom in must still work');
 await dragAcross();await dragAcross();await checkBounds('Pan toward later years');
 await dragAcross(true);await dragAcross(true);await checkBounds('Pan toward earlier years');
 await page.locator('#fit-view').click();assert.deepEqual((await readAxis()).head,initial.head);
 await page.locator('#lasso-mode').click();const b=await page.locator('.timeline-svg').boundingBox();
 await page.mouse.move(b.x+b.width*.12,b.y+b.height*.15);await page.mouse.down();
 for(const [x,y] of [[.85,.15],[.85,.8],[.12,.8],[.12,.15]])await page.mouse.move(b.x+b.width*x,b.y+b.height*y,{steps:8});
 await page.mouse.up();assert.match(await page.locator('#selection-count').innerText(),/\d[\d,]* observations selected/);
 const download=page.waitForEvent('download');await page.locator('#export-selection').click();assert.match((await download).suggestedFilename(),/t1/);
 await page.locator('#yearMin').fill('2025');await page.locator('#yearMax').fill('2025');
 await page.waitForFunction(()=>window.sqbits.chart?.all().length>0&&window.sqbits.chart.all().every(p=>p.year===2025));
 const single=await checkBounds('Single year');assert.deepEqual(single.ticks,[2025]);
 await page.locator('#yearMax').fill('2024');await page.waitForSelector('.empty-plot');assert.deepEqual((await readAxis()).ticks,[]);
 await page.locator('#reset-filters').click();await page.waitForFunction(()=>window.sqbits.chart?.all().some(p=>p.year<2025));await checkBounds('Reset filters');
 await page.locator('#metric').selectOption('t2_echo');await page.waitForFunction(()=>document.querySelector('#visual-count').textContent.includes('Echo coherence'));await checkBounds('Different metric');
 mkdirSync('verification',{recursive:true});await page.screenshot({path:'verification/timeline-axis.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('TIMELINE_AXIS_CHECKS_PASSED',JSON.stringify({min:initial.min,max:initial.max,ticks:initial.ticks,observations:initial.count}));
}catch(error){console.error(error);process.exitCode=1;}finally{await browser.close();}
