import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {distributionBins} from '../src/design-distributions.js';
const read=f=>JSON.parse(f.endsWith('.gz')?gunzipSync(readFileSync(new URL('../public/data/'+f,import.meta.url))):readFileSync(new URL('../public/data/'+f,import.meta.url)));
test('numeric histograms count a repeated configuration once per entry per bin',()=>{
 const bins=distributionBins([{value:1,key:1},{value:1,key:1},{value:1,key:2},{value:2,key:1}]);const first=bins.find(b=>b.rows.some(r=>r.value===1));assert.equal(first.count,2);assert.equal(bins.flatMap(b=>b.rows).length,4);
 const log=distributionBins([{value:1e-9,key:1},{value:1e-6,key:2},{value:1e-3,key:3}],{log:true});assert.equal(log.flatMap(b=>b.rows).length,3);assert.ok(log.every(b=>b.min>0));
});
test('numeric facets align with immutable records and retain distinct units',()=>{
 const n=read('design-numeric.json.gz'),ds=read('devices.json.gz').nodes;assert.equal(n.records.length,ds.length);assert.equal(n.record_ids_sha256,createHash('sha256').update(ds.map(d=>d.id).join('\n')).digest('hex'));assert.equal(n.source_manifest_sha256,read('summary.json').provenance.sourceManifestSha256);
 assert.equal(new Set(n.fields.map(f=>f.id)).size,n.fields.length);for(const rows of n.records)for(const [field,value] of rows){assert.ok(n.fields[field].unit);assert.ok(Number.isFinite(value));}
});
test('review and fabrication counts distinguish segment flags from record inheritance',()=>{
 const c=read('coverage-report.json');assert.equal(c.review.papers,1774);assert.equal(c.review.flaggedSegments,1792);assert.equal(c.review.recordsInFlaggedSegments,8256);assert.equal(c.fabrication.withSteps,9623);assert.equal(c.fabrication.withProcessConditions,7415);assert.equal(c.fabrication.papers.withSteps,2709);assert.equal(c.fabrication.papers.withProcessConditions,1837);assert.ok(c.fabrication.withProcessConditions<=c.fabrication.withProcessParameters);
});
