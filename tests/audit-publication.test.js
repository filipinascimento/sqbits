import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {auditedRows} from '../src/audit.js';
const read=name=>{const b=readFileSync(new URL('../public/data/'+name,import.meta.url));return JSON.parse(name.endsWith('.gz')?gunzipSync(b):b);};
test('published audit covers every selected yearly tail and preserves raw source identity',()=>{
 const a=read('outcome-audit.json.gz'),summary=read('summary.json'),coverage=read('outcome-audit-coverage.json'),ds=read('devices.json.gz').nodes,findings=Object.values(a.findings);
 assert.equal(a.pending,0,'Unfinished audit claims cannot be published as complete');assert.equal(a.source_manifest_sha256,summary.provenance.sourceManifestSha256);assert.equal(findings.length,a.audited_observations);
 for(const m of summary.metrics){const rows=new Map(read(`outcomes/${m.id}.json.gz`).map(p=>[p.id,p]));const checked=findings.filter(f=>f.metric===m.id);assert.ok(checked.length>0,m.id+' must have source audits');
  for(const f of checked){const p=rows.get(f.key.slice(m.id.length+1));assert.ok(p);assert.equal(f.original_value,p.value);assert.equal(f.device_id,ds[p.device].id);assert.match(f.source_pointer,/^\/records\/\d+\/(outcomes|design_choices)\/\d+$/);assert.match(f.recordset_sha256,/^[a-f0-9]{64}$/);assert.match(f.pdf_sha256,/^[a-f0-9]{64}$/);if(f.action!=='unresolved'){assert.ok(f.source_quote_matched||f.direct_source_checked);assert.ok(f.page>0);}
   if(f.action==='correct'){assert.ok(Number.isFinite(f.value)&&f.value>=0);assert.equal(f.corrected_normalized.status,'converted');assert.ok(Math.abs(f.corrected_normalized.value*m.factor-f.value)<=Math.max(1e-10,Math.abs(f.value)*1e-10));}
  }
 }
 for(const g of coverage.groups){assert.equal(g.selected,Math.min(g.population,Math.max(5,Math.ceil(g.population*.05))));const reason=`${g.scope}:${g.tail}:${g.year}`;assert.equal(findings.filter(f=>f.metric===g.metric&&f.selection_reasons.includes(reason)).length,g.selected,JSON.stringify(g));}
});
test('numeric color summaries agree with corrected and reclassified outcomes',()=>{
 const a=read('outcome-audit.json.gz'),summary=read('summary.json'),ds=read('devices.json.gz').nodes,best=new Map();
 for(const m of summary.metrics)for(const p of auditedRows(read(`outcomes/${m.id}.json.gz`),m.id,a)){
  if(p.excluded||p.quarantined||p.audit?.frontier_eligible===false||p.origin!=='measured'||!['exact','approximate','with_uncertainty'].includes(p.nature))continue;
  if(!best.has(p.device))best.set(p.device,{});const b=best.get(p.device),old=b[m.id];if(old==null||(m.direction==='min'?p.value<old:p.value>old))b[m.id]=p.value;
 }
 for(let i=0;i<ds.length;i++){const actual=a.device_best[i]||ds[i].best,expected=best.get(i)||{};assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort());for(const key of Object.keys(expected))assert.ok(Math.abs(actual[key]-expected[key])<=Math.max(1e-10,Math.abs(expected[key])*1e-10),ds[i].id+' '+key);}
});
