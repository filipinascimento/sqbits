import test from 'node:test';
import assert from 'node:assert/strict';
import {groupSelection} from '../src/selection.js';
const papers=[{label:'First paper',year:2020},{label:'Second paper',year:2025}];
const devices=[{id:'a',label:'Q1',paper:0},{id:'b',label:'Q1',paper:0},{id:'c',label:'Q1',paper:1}];
test('selection keeps distinct record IDs and groups only selected observations by paper',()=>{
 const points=[{id:'first',device:0,value:2},{id:'second',device:0,value:3},{id:'third',device:2,value:4}];
 const groups=groupSelection({points,papers,devices});
 assert.deepEqual(groups.map(g=>g.index),[1,0]);
 assert.deepEqual(groups.flatMap(g=>g.devices.map(d=>d.device.id)),['c','a']);
 assert.deepEqual(groups[1].devices[0].points,points.slice(0,2));
});
test('selected papers list their own devices, including records with the same name',()=>{
 const groups=groupSelection({paperIndices:[0],papers,devices});
 assert.equal(groups.length,1);assert.deepEqual(groups[0].devices.map(d=>d.index),[0,1]);
});
test('empty and device-only network selections do not include unselected records',()=>{
 assert.deepEqual(groupSelection({papers,devices}),[]);
 const groups=groupSelection({deviceIndices:[1],papers,devices});
 assert.equal(groups[0].devices.length,1);assert.equal(groups[0].devices[0].device.id,'b');
});
