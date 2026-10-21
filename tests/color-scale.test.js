import test from 'node:test';
import assert from 'node:assert/strict';
import {numericColorScale,missingColor} from '../src/color-scale.js';
import {encoding} from '../src/data.js';
import {colorLegendHTML} from '../src/color-legend.js';
import {rgb} from 'd3';
import {Mapper} from '../node_modules/helios-web/src/pipeline/Mapper.js';
import {buildMapperRulePredicate} from '../node_modules/helios-web/src/behaviors/mapperBehaviorShared.js';

test('coherence colors and colorbar positions are logarithmic in original units',()=>{
 const s=numericColorScale([.1,1,10,100,1000,NaN],{id:'t1',label:'T₁',unit:'µs'});
 assert.equal(s.type,'log');assert.ok(Math.abs(s.position(10)-.5)<1e-12);
 assert.ok(Math.abs(s.position(1)-s.position(.1)-(s.position(100)-s.position(10)))<1e-12);
 assert.equal(s.color(NaN),missingColor);assert.match(s.colorbar.title,/µs/);
 for(const tick of s.colorbar.ticks)assert.ok(Math.abs(tick.offset-s.position(tick.value))<1e-12);
 assert.match(colorLegendHTML({...s,numeric:true}),/linearGradient/);
 const linear=numericColorScale([.1,1000],{id:'t1',label:'T₁',unit:'µs'},'linear');assert.equal(linear.type,'linear');assert.ok(linear.position(10)<.02);
});
test('years stay linear and count colors include zero on log1p',()=>{
 const year=numericColorScale([2000,2010,2020],{id:'year',label:'Year',unit:'1'});assert.equal(year.type,'linear');assert.equal(year.position(2010),.5);
 const count=numericColorScale([0,1,10,1000],{id:'devices',label:'Records',unit:'1'});assert.equal(count.type,'log1p');assert.equal(count.position(0),0);assert.notEqual(count.color(0),missingColor);
});
test('fidelity colors use fractional gaps, preserve ideal endpoints and label raw fidelity',()=>{
 const a=numericColorScale([90,99,99.9,100],{id:'readout_fidelity',label:'Fidelity',unit:'%'}),b=numericColorScale([.9,.99,.999,1],{id:'readout_fidelity',label:'Fidelity',unit:'1'});
 assert.equal(a.type,'log-complement');assert.ok(Math.abs(a.position(99)-.5)<1e-12);assert.ok(a.position(99.9)>a.position(99));assert.equal(a.position(100),1);
 assert.equal(a.mapperValue(100),0);assert.ok(a.legend.some(l=>l.label==='100% (ideal; zero gap)'));assert.equal(a.color(100),a.boundaryColor);
 for(const value of [90,99,99.9])assert.ok(Math.abs(a.position(value)-b.position(value/100))<1e-12);
 assert.equal(a.color(100.01),missingColor);assert.equal(a.color(-1),missingColor);
 for(const tick of a.colorbar.ticks)assert.ok(Math.abs(tick.offset-a.position(tick.value))<1e-10);
 const exact=numericColorScale([100],{id:'readout_fidelity',label:'Fidelity',unit:'%'});assert.equal(exact.colorbar,null);assert.notEqual(exact.color(100),missingColor);
});
test('zero errors, tiny loss values, constants and missing data stay distinct',()=>{
 const error=numericColorScale([0,.001,1,undefined],{id:'logical_error',label:'Error',unit:'1'});assert.equal(error.position(0),0);assert.notEqual(error.color(0),missingColor);assert.ok(error.legend.some(l=>l.label==='0 (ideal)'));
 const tiny=numericColorScale([1e-20,1e-16,1e-12],{id:'tls_loss',label:'Loss',unit:'1'});assert.ok(tiny.domain[0]>=1);assert.ok(Math.abs(tiny.position(1e-16)-.5)<1e-12);
 const same=numericColorScale([2,2],{id:'t1',label:'T₁',unit:'µs'});assert.equal(same.colorbar.ticks.length,1);assert.equal(same.colorbar.ticks[0].value,2);assert.equal(new Set(same.colorbar.stops.map(s=>s.color)).size,1);
 const empty=numericColorScale([undefined,NaN],{id:'t1',label:'T₁',unit:'µs'});assert.equal(empty.colorbar,null);assert.equal(empty.color(NaN),missingColor);
});
test('network encodings use audited numeric values without modifying their records',()=>{
 const nodes=[{best:{t1:1}},{best:{t1:10}},{best:{t1:100}},{best:{}}],before=structuredClone(nodes),enc=encoding(nodes,'t1');
 assert.equal(enc.numeric,true);assert.equal(enc.color(nodes[1]),enc.colorbar.stops[16].color);assert.equal(enc.mapperValue(nodes[0]),1);assert.ok(Number.isNaN(enc.mapperValue(nodes[3])));assert.deepEqual(nodes,before);
});
test('the installed Helios mapper agrees with the legend, including tiny gaps and ideal values',()=>{
 for(const [id,unit,values] of [['t1','µs',[.001,1,1000,undefined]],['readout_fidelity','%',[90,99,99.9999999999,100,undefined]],['tls_loss','1',[0,1e-20,1e-16,1e-12,undefined]],['devices','1',[0,1,1000,undefined]],['year','1',[1999,2020,2026,undefined]]]){
  const s=numericColorScale(values,{id,label:id,unit}),zeroRule={op:'eq',rhs:0};
  const mapper=new Mapper().setChannel('color',{type:'colormap',attributes:'v',colormap:'interpolateViridis',domain:s.domain,transformType:s.nativeType,defaultValue:missingColor,rules:s.boundaryColor?[{__ui:zeroRule,when:buildMapperRulePredicate(zeroRule),value:s.boundaryColor}]:[]});
  for(const value of values){const output=mapper.mapItem({v:Math.fround(s.mapperValue(value))}).color,expected=rgb(s.color(value)),actual=Array.isArray(output)?output.slice(0,3):[rgb(output).r/255,rgb(output).g/255,rgb(output).b/255];
   assert.ok(actual.every((c,i)=>Math.abs(c-[expected.r,expected.g,expected.b][i]/255)<1/255+1e-6),`${id}: ${value}`);
  }
 }
});
