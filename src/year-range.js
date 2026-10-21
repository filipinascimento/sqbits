// Import the published leaf control: the full Helios renderer/WASM stays lazy.
import {TwoHandleRange} from '../node_modules/helios-web/src/ui/controls/TwoHandleRange.js';

export function yearExtent(nodes){
 let min=Infinity,max=-Infinity;
 for(const {year} of nodes)if(Number.isInteger(year)){min=Math.min(min,year);max=Math.max(max,year);}
 return min===Infinity?null:[min,max];
}
export function clampYearRange(range,[min,max]){
 const year=(v,fallback)=>v==null||v===''||!Number.isFinite(Number(v))?fallback:Math.max(min,Math.min(max,Math.round(Number(v))));
 const a=year(range?.[0],min),b=year(range?.[1],max);return [Math.min(a,b),Math.max(a,b)];
}
export function panYearRange(range,delta,extent){
 const [lo,hi]=clampYearRange(range,extent),shift=Math.max(extent[0]-lo,Math.min(extent[1]-hi,Math.round(delta)));
 return [lo+shift,hi+shift];
}

export function mountYearRange(container,{nodes,filters,onCommit,inputIds=['yearMin','yearMax']}){
 const extent=yearExtent(nodes);container.classList.add('year-range');container.setAttribute('role','group');container.setAttribute('aria-label','Publication year range');
 if(!extent){container.textContent='Publication years unavailable';return {destroy(){},set(){},get value(){return null;}};}
 const [min,max]=extent,hintId=container.id+'-hint';let dead=false,dragging=false,value=clampYearRange([filters.yearMin,filters.yearMax],extent),applied=[...value],control;
 container.dataset.engine='helios-two-handle-range';
 container.innerHTML=`<div class="year-range-heading"><span>Publication years</span><button type="button" class="year-range-reset">All years</button></div><output class="year-range-value"></output><div class="year-range-host"></div><div class="year-range-extents" aria-hidden="true"><span>${min}</span><span>${max}</span></div><p class="year-range-hint" id="${hintId}">Resize with the handles. Move the range using the band or middle grip.</p><span class="year-range-status sr-only" role="status"></span>`;
 const output=container.querySelector('output'),reset=container.querySelector('button'),status=container.querySelector('[role=status]');
 const text=()=>value[0]===value[1]?String(value[0]):`${value[0]}–${value[1]}`;
 function paint(next){
  if(dead)return;value=clampYearRange(next,extent);
  if(control){
   control.aInput.value=String(value[0]);control.bInput.value=String(value[1]);control.setVisual(...value);
   control.aInput.setAttribute('aria-valuemax',String(value[1]));control.bInput.setAttribute('aria-valuemin',String(value[0]));
   for(const [i,input] of [control.aInput,control.bInput].entries())input.setAttribute('aria-valuetext',String(value[i]));
   const band=control.element.querySelector('.helios-ui-range2__range');
   band.setAttribute('aria-valuemax',String(max-(value[1]-value[0])));band.setAttribute('aria-valuenow',String(value[0]));band.setAttribute('aria-valuetext',text());
  }
  output.textContent=text();reset.disabled=value[0]===min&&value[1]===max;container.classList.toggle('year-range-collapsed',value[0]===value[1]);
 }
 function commit(next){
  if(dead)return;paint(next);if(value.every((v,i)=>v===applied[i]))return;applied=[...value];status.textContent='Publication years: '+text();
  onCommit({yearMin:value[0]===min?'':value[0],yearMax:value[1]===max?'':value[1]});
 }
 control=new TwoHandleRange({min,max,value,step:1,allowRangeDrag:true,onChange:paint,onCommit:commit});
 container.querySelector('.year-range-host').append(control.element);
 for(const [i,input] of [control.aInput,control.bInput].entries()){
  input.id=inputIds[i];input.setAttribute('aria-label',i?'Latest publication year':'Earliest publication year');input.setAttribute('aria-describedby',hintId);input.disabled=min===max;
  // Keep semantic handles ordered; the native control otherwise swaps values.
  input.addEventListener('input',()=>{input.value=String(i?Math.max(Number(input.value),Number(control.aInput.value)):Math.min(Number(input.value),Number(control.bInput.value)));},true);
 }
 const band=control.element.querySelector('.helios-ui-range2__range');
 const grip=document.createElement('span');grip.className='year-range-grip';grip.setAttribute('aria-hidden','true');grip.title='Drag to move the selected year interval';band.append(grip);
 band.tabIndex=min===max?-1:0;band.setAttribute('role','slider');band.setAttribute('aria-label','Publication year interval');band.setAttribute('aria-valuemin',String(min));band.setAttribute('aria-describedby',hintId);
 const start=event=>{if(event.button!=null&&event.button!==0)return;dragging=true;band.setPointerCapture?.(event.pointerId);};
 const finish=()=>{dragging=false;};
 band.addEventListener('pointerdown',start);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
 band.onkeydown=event=>{
  const shifts={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1,PageDown:-5,PageUp:5,Home:min-value[0],End:max-value[1]};
  if(!(event.key in shifts))return;event.preventDefault();commit(panYearRange(value,shifts[event.key]*(event.shiftKey&&event.key.startsWith('Arrow')?5:1),extent));
 };
 reset.onclick=()=>commit(extent);paint(value);
 return {get value(){return [...value];},set(next){paint([next.yearMin,next.yearMax]);applied=[...value];},destroy(){
  dead=true;
  // Helios attaches window listeners during a band drag. End that gesture even
  // when navigation removes the control before the real pointerup arrives.
  if(dragging)window.dispatchEvent(new PointerEvent('pointercancel'));
  window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);band.removeEventListener('pointerdown',start);control.destroy();
 }};
}
