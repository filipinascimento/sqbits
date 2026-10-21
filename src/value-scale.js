import {format} from 'd3';

// Explicit semantics: dimensionless Q factors and zero-ideal error/loss
// metrics must never be mistaken for quantities approaching perfect fidelity.
const fidelities=new Set(['single_qubit_gate_fidelity','two_qubit_gate_fidelity','readout_fidelity']);
export function valueScale(metric,log){
 const limit=fidelities.has(metric.id)?metric.unit==='%'?100:metric.unit==='1'?1:null:null;
 const complement=log&&limit!=null,type=complement?'log-complement':log?'log':'linear';
 const axisValue=value=>complement?(limit-value)/limit:value;
 const plottable=value=>Number.isFinite(value)&&(complement?value>=0&&value<limit:!log||value>0);
 const tick=value=>{
  const gap=limit*value;
  // Preserve near-perfect labels without rounding a positive gap to 100%.
  if(gap<1e-8)return `${limit} − ${format('.2~g')(gap)}`;
  return format(`.${Math.min(12,Math.max(0,Math.ceil(-Math.log10(gap))+1))}~f`)(limit-gap);
 };
 return {type,limit,complement,axisValue,plottable,tick,
  controlLabel:limit!=null?`Log distance to ${limit}${metric.unit==='%'?'%':''}`:'Logarithmic value axis',
  axisLabel:`${metric.label} (${metric.unit})${complement?' · log(1 − F)':''}`,
 };
}

// A zero-gap ideal record has no finite logarithmic coordinate. End the
// frontier there, rather than extending the previous, worse record past it.
export function frontierTrace(envelope,end,scale){
 const visible=envelope.filter(p=>p.year<=end),trace=[];
 for(let i=0;i<visible.length;i++){
  const p=visible[i],previous=visible[i-1];
  if(previous&&scale.plottable(previous.value)&&!scale.plottable(p.value))trace.push({...previous,year:p.year});
  trace.push(p);
 }
 const last=visible.at(-1);if(last&&scale.plottable(last.value))trace.push({...last,year:end});
 return trace;
}
