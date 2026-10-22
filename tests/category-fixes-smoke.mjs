import {chromium} from 'playwright';import {readdirSync,existsSync,mkdirSync} from 'node:fs';import {homedir} from 'node:os';import assert from 'node:assert/strict';
const root=homedir()+'/.cache/ms-playwright',executablePath=readdirSync(root).filter(n=>/^chromium-\d+$/.test(n)).sort().map(n=>`${root}/${n}/chrome-linux64/chrome`).find(existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const base=(process.env.SQBITS_TEST_URL||'http://127.0.0.1:5194/sqbits/').split('#')[0];mkdirSync('verification',{recursive:true});
try{
 await page.goto(base+'#trends');await page.waitForFunction(()=>window.sqbits?.trends?.aggregate);
 await page.locator('#design-field').selectOption('superconductor_composition');await page.waitForFunction(()=>window.sqbits.trends.aggregate.field==='superconductor_composition');
 const categories=await page.evaluate(()=>window.sqbits.trends.aggregate.counts.map(r=>r.category));assert.ok(categories.includes('Al'));assert.ok(!categories.includes('aluminum'));assert.ok(!categories.includes('aluminium'));assert.ok(!categories.includes('Aluminum'));
 await page.waitForFunction(()=>document.querySelector('#design-field-note').textContent.includes('provenance fix package'));
 await page.locator('#design-field').selectOption('superconductor_composition_reported');await page.waitForFunction(()=>window.sqbits.trends.aggregate.field==='superconductor_composition_reported');
 assert.ok(await page.evaluate(()=>window.sqbits.trends.aggregate.counts.some(r=>r.category==='aluminum')));
 await page.locator('#design-field').selectOption('substrate_material');await page.waitForFunction(()=>window.sqbits.trends.aggregate.field==='substrate_material');
 assert.ok(await page.evaluate(()=>window.sqbits.trends.aggregate.counts.some(r=>r.category==='Silicon')));assert.ok(!await page.evaluate(()=>window.sqbits.trends.aggregate.counts.some(r=>r.category==='silicon')));
 const i=await page.evaluate(()=>window.sqbits.devices.nodes.findIndex(d=>d.materialReported==='aluminum'&&d.substrateReported));await page.evaluate(i=>window.sqbits.inspectDevice(i),i);await page.waitForSelector('#inspector .category-normalization');
 await page.locator('.category-normalization > summary').click();assert.match(await page.locator('.category-normalization').innerText(),/aluminum → Al/);assert.match(await page.locator('.category-normalization').innerText(),/Equivalent element/);
 const link=page.locator('.category-normalization a'),response=await page.request.get(new URL(await link.getAttribute('href'),base).href);assert.equal(response.status(),200);assert.equal((await response.body()).subarray(0,2).toString(),'PK');
 assert.ok(await page.locator('.device-design-content').getAttribute('data-design-count'));assert.ok((await page.locator('.device-design-content').innerText()).includes('aluminum'));
 await page.locator('#close-inspector').click();await page.locator('[data-view=guide]').first().click();await page.waitForSelector('[data-design-property=superconductor_composition]',{state:'attached'});await page.locator('.topic-button[data-topic="1"]').click();await page.locator('[data-design-property=superconductor_composition]').click();
 assert.equal(await page.locator('[data-design-property=superconductor_composition]').getAttribute('aria-pressed'),'true');
 assert.match(await page.locator('.part-distribution[data-family=materials]').innerText(),/Superconductor composition \(grouped\)/);await page.screenshot({path:'verification/category-normalization-guide.png'});
 console.log('GROUPED_PLOTS_ORIGINAL_WORDING_AND_FIX_DOWNLOAD_PASSED');
 if(process.env.SQBITS_TEST_CATEGORY_NETWORK==='1'){
  await page.evaluate(()=>{window.sqbits.state.networks.devices.running=false;});await page.locator('[data-view=devices]').first().click();await page.waitForFunction(()=>window.sqbits.graph&&!document.querySelector('#graph-mode').disabled);
  console.log('NATIVE_CATEGORY_GRAPH_READY');
  await page.evaluate(async()=>{window.categoryGraph=window.sqbits.graph;window.categoryEngine=window.categoryGraph.helios.layout();window.categoryPositions=Array.from((await window.categoryGraph.helios.snapshotNodePositions([0,1,2,3])).positions);});
  assert.equal(await page.evaluate(()=>window.sqbits.graph.helios.behavior.layout.parameter('alphaDecay')),.006);
  const options=await page.locator('#material option').evaluateAll(o=>o.map(n=>n.value));assert.ok(options.includes('Al'));assert.ok(!options.includes('aluminum'));assert.ok(!options.includes('aluminium'));
  await page.locator('#material').selectOption('Al');await page.waitForFunction(()=>window.sqbits.state.filters.material==='Al');await page.waitForTimeout(350);
  const filter=await page.evaluate(async()=>{const {graph,devices}=window.sqbits;return {same:graph===window.categoryGraph&&graph.helios.layout()===window.categoryEngine,actual:graph.helios.getGraphFilter().nodeCount,expected:devices.nodes.filter(d=>d.degree>0&&d.material==='Al').length,positions:Array.from((await graph.helios.snapshotNodePositions([0,1,2,3])).positions),original:window.categoryPositions};});assert.ok(filter.same);assert.equal(filter.actual,filter.expected);assert.deepEqual(filter.positions,filter.original);
  await page.locator('#search').fill('aluminium');await page.waitForTimeout(500);const result=await page.evaluate(()=>({actual:window.sqbits.graph.helios.getGraphFilter().nodeCount,expected:window.sqbits.devices.nodes.filter(d=>d.degree>0&&d.material==='Al'&&[d.label,d.type,d.material,d.materialReported,d.substrate,d.substrateReported,d.junction,d.geometry,window.sqbits.papers.nodes[d.paper].label].join(' ').toLowerCase().includes('aluminium')).length}));assert.equal(result.actual,result.expected);assert.ok(result.actual>0);
  await page.locator('#graph-mode').selectOption('3d');await page.waitForFunction(()=>!document.querySelector('#graph-mode').disabled&&window.sqbits.graph.helios.mode()==='3d');assert.equal(await page.evaluate(()=>window.sqbits.graph.helios.behavior.layout.parameter('alphaDecay')),.006);
  console.log('NATIVE_GROUPED_CATEGORY_FILTERS_PASSED',filter.actual,result.actual);
 }
 assert.deepEqual(errors,[]);console.log('CATEGORY_GROUPING_AND_PROVENANCE_UI_PASSED');
}catch(e){console.error(e);process.exitCode=1;}finally{await browser.close();}
