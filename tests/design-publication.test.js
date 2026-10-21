import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {groupDesignChoices,deviceDesignHTML} from '../src/designs.js';
const bytes=name=>readFileSync(new URL('../public/data/'+name,import.meta.url));
const read=name=>JSON.parse(name.endsWith('.gz')?gunzipSync(bytes(name)):bytes(name));
test('the categorical index covers every device and preserves original-record identity',()=>{
 const a=read('design-index.json.gz'),ds=read('devices.json.gz').nodes,catalog=read('design-catalog.json'),families=new Set(catalog.families.map(f=>f.id));
 assert.equal(a.records.length,ds.length);assert.equal(a.source_manifest_sha256,read('summary.json').provenance.sourceManifestSha256);assert.equal(a.devices_sha256,createHash('sha256').update(bytes('devices.json.gz')).digest('hex'));
 let count=0;for(let i=0;i<ds.length;i++){const r=a.records[i];assert.equal(r.id,ds[i].id);count+=r.designCount;assert.ok(r.families.every(f=>families.has(f)));for(const values of Object.values(r.values)){assert.equal(new Set(values).size,values.length);assert.ok(values.every(v=>Number.isInteger(v)&&v>=0&&v<a.dictionary.length));}}
 assert.equal(count,a.summary.designObservations);assert.equal(count,235479);assert.equal(a.fields.some(f=>f.id==='t1'),false);
});
test('all device C choices and linked fabrication steps are rendered without dropping qualifiers',()=>{
 const catalog=read('design-catalog.json'),detail={...read('details/c8.json.gz')['c8fc16c8665412e455b1_p00001_00010:2'],catalog},before=structuredClone(detail),groups=groupDesignChoices(detail.record.design_choices,catalog),html=deviceDesignHTML(detail);
 assert.equal(groups.flatMap(g=>g.choices).length,20);assert.match(html,/data-design-count="20"/);assert.match(html,/data-step-count="4"/);assert.match(html,/a few shorts; three times lower inductance/);assert.match(html,/Dolan/);assert.match(html,/PDF p\. 4/);assert.deepEqual(detail,before);
 const a=read('design-index.json.gz'),r=a.records[34214];assert.equal(r.designCount,20);assert.equal(r.stepCount,4);assert.deepEqual(r.values.material_family.map(i=>a.dictionary[i]).sort(),['Al','Cu']);
 assert.deepEqual(r.values.superconductor_composition.map(i=>a.dictionary[i]).sort(),[...new Set(detail.record.design_choices.filter(o=>o.property_name==='superconductor_composition').map(o=>o.reported_text.replace(/\s+/g,' ').trim()))].sort());
});
test('unknown design properties stay visible and source text is escaped',()=>{
 const catalog=read('design-catalog.json'),choice={property_name:'new_property',reported_name:'<script>',reported_text:'full description <not markup>',quantity:{text:'short'},evidence:[]};
 const detail={record:{device_id:'Q',design_choices:[choice]},fabrication_processes:[],source_page_start:1,catalog};
 assert.equal(groupDesignChoices([choice],catalog)[0].id,'design');const html=deviceDesignHTML(detail);assert.match(html,/full description &lt;not markup&gt;/);assert.doesNotMatch(html,/<script>/);
});
