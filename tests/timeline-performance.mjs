import {chromium} from 'playwright';
import {existsSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';import {homedir} from 'node:os';
const root=`${homedir()}/.cache/ms-playwright`,executablePath=readdirSync(root).filter(x=>/^chromium-\d+$/.test(x)).sort().map(x=>`${root}/${x}/chrome-linux64/chrome`).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1500,height:1100}});
try{await page.goto((process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/')+'#timeline');await page.waitForFunction(()=>window.sqbits?.chart?.all().length>0);
const results=await page.evaluate(async()=>{const node=document.querySelector('.timeline-svg'),r=node.getBoundingClientRect(),frames=[],handlers=[];let last=performance.now();
for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);const now=performance.now();if(i>10)frames.push(now-last);last=now;const start=performance.now();node.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:r.x+r.width*.6,clientY:r.y+r.height*.5,deltaY:i<45?-18:18,view:window}));handlers.push(performance.now()-start);}
await new Promise(requestAnimationFrame);const stats=a=>{a.sort((a,b)=>a-b);return {median_ms:a[Math.floor(a.length*.5)],p95_ms:a[Math.floor(a.length*.95)],max_ms:a.at(-1)}};return {observations:window.sqbits.chart.count,frames:stats(frames),wheel_handlers:stats(handlers),dom_elements:node.querySelectorAll('*').length};});
mkdirSync('verification',{recursive:true});writeFileSync(`verification/performance-${process.env.BENCH_LABEL||'current'}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
