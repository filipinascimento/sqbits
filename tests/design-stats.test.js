import test from 'node:test';import assert from 'node:assert/strict';
import {aggregateDesigns,designCategories,supportingDesignRecords,designSeriesCSVRows} from '../src/design-stats.js';
const papers=[{label:'A'},{label:'B'},{label:'C'},{label:'Undated'}];
const devices=[{paper:0,year:2020},{paper:0,year:2020},{paper:1,year:2022},{paper:2,year:2022},{paper:3,year:null,realization:'simulated'}].map((d,i)=>({label:'Q'+i,scope:'individual_qubit',attribution:'own_work',realization:'measured_device',...d}));
const index={dictionary:['Al','Nb'],families:[{id:'materials',label:'Materials'}],records:[[0,0,1],[0],[1],[],[0]].map(values=>({families:values.length?['materials']:[],values:{material_family:values}}))};
const run=patch=>aggregateDesigns({devices,papers,index,field:'material_family',...patch});
test('design shares count presence, preserve multi-label categories and separate missing reporting',()=>{
 const a=run({});assert.equal(a.total,5);assert.equal(a.reporting,4);assert.equal(a.missing,1);assert.equal(a.denominator,5);assert.deepEqual(a.counts.map(r=>[r.category,r.count,r.percent]),[['Al',3,60],['Nb',2,40]]);
 const conditional=run({denominator:'reporting'});assert.equal(conditional.denominator,4);assert.deepEqual(conditional.counts.map(r=>r.percent),[75,50]);assert.equal(conditional.families[0].count,4);
 assert.deepEqual(designCategories(index.records[0],'material_family',index),['Al','Nb']);
});
test('paper counting unions device choices and never counts repeated configurations twice',()=>{
 const a=run({unit:'papers',denominator:'reporting'});assert.equal(a.total,4);assert.equal(a.reporting,3);assert.deepEqual(a.counts.map(r=>[r.category,r.count]),[['Al',2],['Nb',2]]);
 assert.equal(a.years[0].total,1);assert.equal(a.years[0].counts.Al,1);assert.equal(a.years[0].counts.Nb,1);
});
test('annual gaps, observed zeros, unknown years and period endpoints remain distinct',()=>{
 const a=run({});assert.deepEqual(a.years.map(y=>y.year),[2020,2021,2022]);assert.equal(a.unknownYear,1);
 const rows=designSeriesCSVRows(a,['Al','Nb']);assert.equal(rows.find(r=>r.period_start===2021).share_percent,'');assert.equal(rows.find(r=>r.period_start===2022&&r.category==='Al').share_percent,0);
 const grouped=run({bin:5});assert.equal(grouped.years.at(-1).end,2022);assert.equal(grouped.years.at(-1).year,2020);
});
test('population filters and chart drill-down use the same device observations',()=>{
 const a=run({filters:{scope:'individual_qubit',realization:'measured_device',attribution:'own_work'}});assert.equal(a.total,4);assert.equal(a.unknownYear,0);
 assert.deepEqual(supportingDesignRecords(a,devices,index,'Al'),[0,1]);assert.deepEqual(supportingDesignRecords(a,devices,index,'Nb',2022),[2]);
 const empty=run({filters:{search:'nothing-matches'}});assert.equal(empty.total,0);assert.deepEqual(empty.years,[]);assert.deepEqual(empty.counts,[]);
 const one=run({filters:{yearMin:2022,yearMax:2022}});assert.deepEqual(one.years.map(y=>y.year),[2022]);
});
