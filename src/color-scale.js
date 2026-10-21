import {interpolateViridis,scaleLog,scaleLinear,format} from 'd3';
import {valueScale} from './value-scale.js';

export const missingColor='#a4ada9';
const counts=new Set(['degree','devices','qubit_count']);
const zeroIdeal=new Set(['single_qubit_gate_error','two_qubit_gate_error','readout_error','logical_error','tls_loss']);

// One definition supplies the canvas colors, Helios mapper and colorbar. Raw
// values and units stay intact; only the temporary rendering attribute changes.
export function numericColorScale(values,metric,mode='auto'){
 const fidelity=valueScale(metric,true),complement=mode!=='linear'&&fidelity.limit!=null;
 const type=complement?'log-complement':mode==='auto'?(metric.id==='year'?'linear':counts.has(metric.id)?'log1p':'log'):mode;
 const nativeType=type==='log-complement'?'log':type,logarithmic=nativeType==='log';
 const boundary=v=>Number.isFinite(v)&&logarithmic&&(complement?v===fidelity.limit:zeroIdeal.has(metric.id)&&v===0);
 const valid=v=>Number.isFinite(v)&&(fidelity.limit==null||(v>=0&&v<=fidelity.limit))&&(logarithmic?(complement?v<fidelity.limit:v>0):nativeType==='log1p'?v>=0:true);
 const axis=v=>complement?fidelity.axisValue(v):v,regular=values.filter(valid),axisValues=regular.map(axis);
 const lo=axisValues.length?Math.min(...axisValues):0,hi=axisValues.length?Math.max(...axisValues):1;
 // Helios clamps log-domain endpoints below 1e-12. A common unit rescaling
 // avoids that clamp and float underflow without changing logarithmic ratios.
 const reference=logarithmic&&lo>0?(10**Math.floor(Math.log10(lo))||lo):1;
 const domain=complement?[hi/reference,lo/reference]:[lo/reference,hi/reference];
 const constant=regular.length>0&&lo===hi;
 if(constant){const v=lo/reference;if(logarithmic){domain[0]=v/10;domain[1]=v*10;}else if(nativeType==='log1p'){domain[0]=0;domain[1]=v?Math.expm1(2*Math.log1p(v)):1;}else{const pad=Math.abs(v)*.05||.5;domain[0]=v-pad;domain[1]=v+pad;}}
 if(!regular.length){domain[0]=logarithmic?1:0;domain[1]=logarithmic?10:1;}
 const transform=v=>nativeType==='log'?Math.log(v):nativeType==='log1p'?Math.log1p(v):v;
 const transformed=domain.map(transform),boundaryColor=interpolateViridis(complement?1:0);
 const mapperValue=v=>boundary(v)?0:valid(v)?axis(v)/reference:NaN;
 const position=v=>boundary(v)?complement?1:0:valid(v)?Math.max(0,Math.min(1,(transform(mapperValue(v))-transformed[0])/(transformed[1]-transformed[0]))):NaN;
 const color=v=>{const t=position(v);return Number.isFinite(t)?interpolateViridis(t):missingColor;};
 const raw=input=>complement?fidelity.limit*(1-input*reference):input*reference;
 const label=input=>complement?fidelity.tick(input*reference):metric.id==='year'?format('d')(raw(input)):format('.3~g')(raw(input));
 let ticks=[];
 if(regular.length){
  if(constant)ticks=[{value:regular[0],offset:.5,label:label(lo/reference)}];
  else{
   const candidates=logarithmic?scaleLog().domain(domain).ticks(6):nativeType==='log1p'?scaleLinear().domain(transformed).ticks(6).map(Math.expm1):scaleLinear().domain(domain).ticks(6);
   const sorted=[domain[0],...candidates,domain[1]].map(input=>({value:raw(input),offset:(transform(input)-transformed[0])/(transformed[1]-transformed[0]),label:label(input)})).filter(t=>t.offset>=-1e-8&&t.offset<=1+1e-8).sort((a,b)=>a.offset-b.offset);
   for(const tick of sorted)if(!ticks.length||(tick.offset-ticks.at(-1).offset>=(complement?.24:.19)&&tick.offset<.84))ticks.push(tick);
   if(ticks.at(-1).offset<1-1e-8)ticks.push(sorted.at(-1));
  }
 }
 const scaleLabel=type==='log-complement'?`Log distance to ${fidelity.limit}${metric.unit==='%'?'%':''} · 1 − F`:type==='log1p'?'Logarithmic · log(1 + count)':type==='log'?'Logarithmic':'Linear';
 const legend=[{label:'Not reported',color:missingColor}];
 if(values.some(boundary))legend.push({label:complement?`${fidelity.limit}${metric.unit==='%'?'%':''} (ideal; zero gap)`:`0${metric.unit&&metric.unit!=='1'?' '+metric.unit:''} (ideal)`,color:boundaryColor});
 if(values.some(v=>Number.isFinite(v)&&!valid(v)&&!boundary(v)))legend.push({label:'Outside color scale',color:missingColor});
 const colorbar=regular.length?{title:metric.label+(metric.unit&&metric.unit!=='1'?' ('+metric.unit+')':''),scaleLabel,type,constant,ticks,stops:Array.from({length:33},(_,i)=>({offset:i/32,color:constant?color(regular[0]):interpolateViridis(i/32)}))}:null;
 return {type,nativeType,domain,reference,mapperValue,position,color,colorbar,legend,boundaryColor:values.some(boundary)?boundaryColor:null,controlLabel:fidelity.limit!=null?`Log distance to ${fidelity.limit}${metric.unit==='%'?'%':''}`:'Logarithmic'};
}
