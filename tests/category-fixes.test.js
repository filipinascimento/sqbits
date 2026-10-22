import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {applyCategoryFixes,applyDesignCategoryFixes,categoryFixesHTML} from '../src/category-fixes.js';
import {matchesDevice} from '../src/data.js';import {aggregateDesigns} from '../src/design-stats.js';
const root=new URL('../public/data/',import.meta.url),bytes=p=>readFileSync(new URL(p,root)),read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(bytes(p)):bytes(p)),hash=p=>createHash('sha256').update(bytes(p)).digest('hex'),folder='fixes/material-substrate-v1/';
const fixes=read(folder+'overlay.json.gz'),manifest=read(folder+'manifest.json'),raw=read('devices.json.gz'),index=read('design-index.json.gz'),source=read('summary.json').provenance.sourceManifestSha256;
const data=applyCategoryFixes(raw,fixes,source),grouped=applyDesignCategoryFixes(index,fixes),fields={material:'superconductor_composition',substrate:'substrate_material'};
test('the provenance package matches the immutable source, scripts and every payload',()=>{
 assert.equal(manifest.devices_sha256,hash('devices.json.gz'));assert.equal(manifest.devices_sha256,'fe9203de8f156df1e88b40820bd6768c3d3f4f9f4f12ca4c0408cfdb1aacab58');
 assert.equal(manifest.design_index_sha256,hash('design-index.json.gz'));assert.equal(manifest.papers_sha256,hash('papers.json.gz'));assert.equal(manifest.source_manifest_sha256,source);
 for(const [p,h] of Object.entries(manifest.sources_sha256)){assert.equal(hash(p),h);assert.equal(index.detail_shards_sha256[p.split('/')[1]],h);}
 for(const [p,h] of Object.entries(manifest.payload_sha256))assert.equal(hash(folder+p),h,p);
 for(const name of ['material_normalization.py','build_category_fixes.py'])assert.deepEqual(bytes(folder+name),readFileSync(new URL('../scripts/'+name,import.meta.url)));
});
test('material and substrate aliases group without mutating raw metadata, observations or graph edges',()=>{
 assert.equal(raw.edges,data.edges);assert.equal(raw.nodes.length,data.nodes.length);assert.notEqual(raw.nodes,data.nodes);assert.equal(index.dictionary.length,read('design-index.json.gz').dictionary.length);
 for(const [kind,field] of Object.entries(fields)){
  for(const term of (kind==='material'?['aluminum','aluminium','Aluminum (Al)']:['silicon','Si','silicon substrate'])){
   const ids=raw.nodes.flatMap((n,i)=>n[kind]===term?[i]:[]);assert.ok(ids.length>0);
   for(const i of ids){assert.equal(data.nodes[i][kind],kind==='material'?'Al':'Silicon');assert.equal(raw.nodes[i][kind],term);assert.equal(data.nodes[i][kind+'Reported'],term);}
  }
  for(const [i,u] of Object.entries(fixes.devices))if(u[kind]){
   assert.equal(raw.nodes[i][kind],u[kind].from);assert.equal(data.nodes[i][kind],u[kind].to);assert.equal(data.nodes[i].id,u.id);
  }
 }
 for(const r of grouped.records)for(const field of Object.values(fields))if(r.values[field])assert.equal(new Set(r.values[field]).size,r.values[field].length,'merged aliases count once per record');
 for(let i=0;i<index.records.length;i++)for(const field of Object.values(fields))assert.deepEqual(grouped.records[i].values[field+'_reported'],index.records[i].values[field]);
});
test('every observation correction has a reproducible raw pointer, reason and source evidence',()=>{
 const changes=read(folder+'changes.json.gz'),papers=read('papers.json.gz').nodes,shards=new Map();assert.equal(changes.length,manifest.changes);
 for(const c of changes){
  if(!shards.has(c.source_detail))shards.set(c.source_detail,read(c.source_detail));const detail=shards.get(c.source_detail)[c.device_id],o=detail.record.design_choices[c.design_choice_index];
  assert.equal(o.reported_text,c.before);assert.equal(o.property_name,c.property);assert.equal(fixes.aliases[c.property][c.before].value,c.after);assert.equal(c.reason,manifest.rules[c.rule]);assert.equal(raw.nodes[c.device_index].id,c.device_id);assert.notEqual(c.before,c.after);
  assert.equal(c.paper_id,papers[c.paper_index].id);assert.equal(c.paper_url,papers[c.paper_index].url);
  assert.ok(grouped.records[c.device_index].values[c.property].map(i=>grouped.dictionary[i]).includes(c.after));assert.deepEqual(c.evidence.map(e=>e.quote),o.evidence.map(e=>e.quote));
 }
 const pending=read(folder+'review.json.gz');assert.equal(pending.length,manifest.review_entries);
 for(const c of pending){assert.equal(c.after,c.before);assert.equal(c.rule,'unresolved');assert.equal(fixes.aliases[c.property][c.before].rule,'unresolved');}
});
test('original wording stays searchable and grouped distributions preserve support and denominators',()=>{
 const papers=read('papers.json.gz').nodes,i=raw.nodes.findIndex(n=>n.material==='aluminium');assert.ok(matchesDevice(data.nodes[i],{material:'Al',search:'aluminium'},papers));
 const aggregate=aggregateDesigns({devices:data.nodes,papers,index:grouped,field:'superconductor_composition'}),al=aggregate.counts.find(r=>r.category==='Al');assert.ok(al.count>1000);assert.equal(aggregate.total,raw.nodes.length);assert.equal(aggregate.population.search,undefined);
 const detail=read('details/c8.json.gz')['c8fc16c8665412e455b1_p00001_00010:2'],before=JSON.stringify(detail),html=categoryFixesHTML(detail,fixes);assert.match(html,/aluminum/);assert.match(html,/→ <strong>Al<\/strong>/);assert.match(html,/high resistivity silicon/);assert.match(html,/Fix package & source provenance/);assert.equal(JSON.stringify(detail),before);
});
test('snapshot or original-value mismatch refuses to apply a stale fix',()=>{
 assert.throws(()=>applyCategoryFixes(raw,fixes,'wrong'),/snapshot/);
 const [i,u]=Object.entries(fixes.devices)[0],key=Object.keys(u).find(k=>k!=='id');assert.throws(()=>applyCategoryFixes({...raw,nodes:raw.nodes.map((n,j)=>j===+i?{...n,[key]:'changed'}:n)},fixes,source),/original value/);
 assert.throws(()=>applyDesignCategoryFixes({...index,dictionary:[]},fixes),/original dictionary/);
});
