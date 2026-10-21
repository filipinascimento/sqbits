import test from 'node:test';import assert from 'node:assert/strict';
import {valueScale,frontierTrace} from '../src/value-scale.js';
import {frontier} from '../src/data.js';
test('fidelity scales use fractional gaps with equivalent percent and fraction units',()=>{
 for(const id of ['single_qubit_gate_fidelity','two_qubit_gate_fidelity','readout_fidelity']){
  const percent=valueScale({id,unit:'%',label:id},true),fraction=valueScale({id,unit:'1',label:id},true);
  assert.equal(percent.type,'log-complement');assert.ok(Math.abs(percent.axisValue(99.9)-.001)<1e-15);assert.ok(Math.abs(fraction.axisValue(.999)-.001)<1e-15);
  assert.equal(percent.tick(.01),'99');assert.equal(percent.tick(.001),'99.9');assert.equal(percent.tick(.0001),'99.99');assert.notEqual(percent.tick(1e-12),'100');
 }
});
test('ideal-limit fidelities have zero gap and no artificial finite logarithmic coordinate',()=>{
 const scale=valueScale({id:'readout_fidelity',unit:'%',label:'F'},true);
 assert.equal(scale.axisValue(100),0);assert.equal(scale.plottable(100),false);assert.equal(scale.plottable(100.01),false);assert.equal(scale.plottable(-1),false);assert.equal(scale.plottable(0),true);assert.equal(scale.plottable(NaN),false);
 const linear=valueScale({id:'readout_fidelity',unit:'%',label:'F'},false);assert.equal(linear.type,'linear');assert.equal(linear.axisValue(99.9),99.9);assert.equal(linear.plottable(100),true);
});
test('zero-ideal errors, losses and unbounded dimensionless Q retain ordinary log scales',()=>{
 for(const id of ['single_qubit_gate_error','two_qubit_gate_error','readout_error','logical_error','tls_loss','resonator_qi','t1']){
  const scale=valueScale({id,unit:'1',label:id},true);assert.equal(scale.type,'log');assert.equal(scale.axisValue(.001),.001);assert.equal(scale.plottable(0),false);
 }
});
test('an omitted ideal record terminates the plotted frontier without inventing later worse records',()=>{
 const points=[{year:2020,value:99,eligible:true},{year:2021,value:100,eligible:true},{year:2022,value:99.9,eligible:true}],before=structuredClone(points),scale=valueScale({id:'readout_fidelity',unit:'%',label:'F'},true),envelope=frontier(points,'max');
 assert.deepEqual(envelope.map(p=>p.value),[99,100]);const trace=frontierTrace(envelope,2024,scale);
 assert.deepEqual(trace.map(p=>[p.year,p.value]),[[2020,99],[2021,99],[2021,100]]);assert.deepEqual(points,before);
 assert.deepEqual(frontierTrace(envelope,2020.5,scale).map(p=>[p.year,p.value]),[[2020,99],[2020.5,99]]);
});
