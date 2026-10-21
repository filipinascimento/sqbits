import {chromium} from 'playwright';import {existsSync,readdirSync,readFileSync} from 'node:fs';import {homedir} from 'node:os';import assert from 'node:assert/strict';
const root=`${homedir()}/.cache/ms-playwright`,executablePath=readdirSync(root).filter(x=>/^chromium-\d+$/.test(x)).sort().map(x=>`${root}/${x}/chrome-linux64/chrome`).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto((process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/')+'#timeline');await page.waitForFunction(()=>window.sqbits?.chart?.count>0);
 assert.equal(await page.evaluate(()=>window.sqbits.chart.all().some(p=>p.id==='34214:10')),false);
 await page.locator('#include-audit-excluded').check();await page.waitForFunction(()=>window.sqbits.chart?.all().some(p=>p.id==='34214:10'));
 const original=await page.evaluate(()=>window.sqbits.chart.all().find(p=>p.id==='34214:10'));assert.equal(original.value,12960000000);assert.equal(original.audit.action,'exclude');assert.equal(original.eligible,false);
 await page.locator('#include-audit-excluded').uncheck();await page.waitForFunction(()=>window.sqbits.chart&&!window.sqbits.chart.all().some(p=>p.id==='34214:10'));
 const corrected=await page.evaluate(()=>{const p=window.sqbits.chart.all().find(p=>p.id==='10873:8');window.sqbits.chart.toggle(p,true);window.sqbits.inspectDevice(p.device,p);return p;});
 assert.equal(corrected.value,.7);assert.equal(corrected.rawValue,700);await page.waitForSelector('#inspector .audit-finding');assert.match(await page.locator('.selected-value strong').innerText(),/0.7 µs/);assert.match(await page.locator('#inspector-content').innerText(),/factor of 1000/);
 await page.locator('#close-inspector').click();const download=page.waitForEvent('download');await page.locator('#export-selection').click();const csv=readFileSync(await (await download).path(),'utf8');assert.match(csv,/"original_value"/);assert.match(csv,/"700"/);assert.match(csv,/"0.7"/);assert.match(csv,/"correct"/);
 await page.locator('#metric').selectOption('single_qubit_gate_fidelity');await page.waitForFunction(()=>window.sqbits.chart?.all().some(p=>p.id==='799:16'));
 const moved=await page.evaluate(()=>window.sqbits.chart.all().find(p=>p.id==='799:16'));assert.equal(moved.value,99.92);assert.equal(moved.audit.action,'reclassified');assert.equal(moved.sourceMetric,'two_qubit_gate_fidelity');
 await page.locator('#metric').selectOption('two_qubit_gate_fidelity');await page.waitForFunction(()=>document.querySelector('#visual-count').textContent.includes('Two-qubit gate fidelity'));assert.equal(await page.evaluate(()=>window.sqbits.chart.all().some(p=>p.id==='799:16')),false);
 await page.locator('[data-view="guide"]').first().click();await page.waitForSelector('.method-cards');assert.match(await page.locator('.method-cards').innerText(),/Source PDF audit/);
 assert.deepEqual(errors,[]);console.log('AUDIT_BROWSER_CHECKS_PASSED',{unitCorrection:corrected.value,rawValue:corrected.rawValue,reclassifiedFidelity:moved.value});
}catch(e){console.error(e);process.exitCode=1;}finally{await browser.close();}
