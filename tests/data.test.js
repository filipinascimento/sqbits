import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {frontier,pointInPolygon,matchesDevice,toCSV,fmt,load,encoding} from '../src/data.js';

test('frontiers honor eligibility, direction and the best same-year observation',()=>{
 const data=[{year:2020,value:10,eligible:true},{year:2019,value:5,eligible:true},{year:2020,value:7,eligible:true},{year:2021,value:100,eligible:false},{year:2022,value:8,eligible:true},{year:2023,value:12,eligible:true}];
 assert.deepEqual(frontier(data).map(d=>d.value),[5,10,12]);
 assert.deepEqual(frontier(data,'min').map(d=>d.value),[5]);
 assert.deepEqual(frontier([]),[]);
});
test('lasso containment and own-work measured default are independent of source labels',()=>{
 assert.equal(pointInPolygon([2,2],[[0,0],[4,0],[4,4],[0,4]]),true);
 assert.equal(pointInPolygon([7,2],[[0,0],[4,0],[4,4],[0,4]]),false);
 const d={label:'Q1',type:'transmon',paper:0,scope:'individual_qubit',attribution:'own_work',realization:'measured_device',year:2020};
 const filters={scope:'individual_qubit',attribution:'own_work',realization:'measured_device'};
 assert.equal(matchesDevice(d,filters,[{label:'test'}]),true);
 for(const mutation of [{attribution:'cited_work'},{realization:'simulated'},{scope:'processor'}])assert.equal(matchesDevice({...d,...mutation},filters,[{label:'test'}]),false);
});
test('CSV preserves quotations, newlines and original units',()=>{
 assert.match(toCSV([{reported:'"T1" = 3 µs\nnext',value:3}]),/""T1""/);
 assert.match(toCSV([{reported:'3 µs'}]),/3 µs/);
});
test('small physical quantities never round to a displayed zero',()=>{
 assert.notEqual(fmt(2e-9),'0');assert.match(fmt(2e-9),/e-9/);assert.equal(fmt(0),'0');
});
test('category colors remain stable after filtering',()=>{
 const a={type:'transmon'},b={type:'fluxonium'};
 assert.equal(encoding([a,b],'type').color(b),encoding([b],'type').color(b));
});
test('XNet exports preserve identity, directedness and similarity weights',()=>{
 for(const name of ['papers','devices']){
  const json=JSON.parse(gunzipSync(readFileSync(new URL('../public/data/'+name+'.json.gz',import.meta.url))));
  const lines=readFileSync(new URL('../Results/'+name+'.xnet',import.meta.url),'utf8').trimEnd().split('\n');
  assert.equal(+lines[0].split(' ')[1],json.nodes.length);assert.equal(lines[1],name==='papers'?'#edges nonweighted directed':'#edges weighted undirected');
  for(let i=0;i<json.edges.length;i++)assert.deepEqual(lines[2+i].split(' ').map(Number),json.edges[i]);
  const idStart=2+json.edges.length;assert.equal(lines[idStart],'#v "id" s');
  assert.deepEqual(lines.slice(idStart+1,idStart+1+json.nodes.length).map(s=>JSON.parse(s)),json.nodes.map(n=>n.id));
 }
});
test('published graph endpoints, identifiers, weights and measurement provenance reconcile',()=>{
 const get=name=>JSON.parse(gunzipSync(readFileSync(new URL('../public/data/'+name+'.json.gz',import.meta.url))));
 const papers=get('papers'),devices=get('devices');
 assert.equal(papers.nodes.length,11746);assert.equal(new Set(devices.nodes.map(d=>d.id)).size,devices.nodes.length);
 for(const data of [papers,devices])for(const [a,b,w] of data.edges){assert.ok(a>=0&&b>=0&&a<data.nodes.length&&b<data.nodes.length&&a!==b);if(w!=null)assert.ok(w>=.22&&w<=1);}
 for(const metric of ['t1','t2_ramsey','t2_echo','single_qubit_gate_error']){
  const rows=get('outcomes/'+metric);for(const p of rows){assert.ok(Number.isFinite(p.value)&&p.value>=0);assert.ok(p.device<devices.nodes.length);if(p.eligible){assert.equal(p.origin,'measured');assert.equal(devices.nodes[p.device].review,false);assert.ok(['exact','approximate','with_uncertainty'].includes(p.nature));}}
 }
});

test('gzip data works with both automatic HTTP decoding and raw GitHub Pages bytes',async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=async url=>new Response(String(url).includes('raw')?gzipSync(Buffer.from('{"ok":true}')):'{"ok":true}');
  assert.deepEqual(await load('raw-test.json.gz'),{ok:true});
  assert.deepEqual(await load('decoded-test.json.gz'),{ok:true});
 }finally{globalThis.fetch=old;}
});
