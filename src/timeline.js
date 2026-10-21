import * as d3 from 'd3';
import {auditLabel} from './audit.js';
import {encoding,frontier,pointInPolygon,fmt,esc,pretty,toCSV,download} from './data.js';
import {valueScale,frontierTrace} from './value-scale.js';

export function mountTimeline(container,{points,metric,devices,papers,colorBy,colorScale='auto',metrics=[],onSelect,onSelection,log=true}){
 let selected=new Set(),mode='lasso',transform=d3.zoomIdentity,polygon=[],dragging=false,disposed=false,frame=0;
 const surface=document.createElement('div');surface.className='timeline-surface';container.append(surface);
 let width=Math.max(280,container.clientWidth),height=Math.max(160,container.clientHeight||570);
 const margin={top:25,right:20,bottom:50,left:72};
 const scale=valueScale(metric,log),dated=points.map(p=>({...p,year:devices[p.device].year})).filter(p=>Number.isFinite(p.year)&&Number.isFinite(p.value));
 const all=dated.filter(p=>scale.plottable(p.value));
 const frontierInputs=scale.complement?dated.filter(p=>p.value>=0&&p.value<=scale.limit):all;
 const omittedAtLimit=scale.complement?dated.filter(p=>p.value===scale.limit).length:0,omittedOther=dated.length-all.length-omittedAtLimit;
 const color=encoding([...new Set(all.map(p=>p.device))].map(i=>devices[i]),colorBy,{metrics,mode:colorScale});
 const years=d3.extent(frontierInputs,d=>d.year),hasYears=Number.isFinite(years[0]);
 const x0=d3.scaleLinear().domain(hasYears?[years[0]-.4,years[1]+.4]:[0,1]).range([margin.left,width-margin.right]);
 let extent=d3.extent(all,d=>scale.axisValue(d.value));if(!all.length)extent=scale.complement?[.001,1]:[1,10];if(extent[0]===extent[1])extent=[extent[0]*.8||.1,extent[1]*1.2||1];
 const y0=(log?d3.scaleLog():d3.scaleLinear()).domain(log?[extent[0]/1.8,scale.complement?Math.min(1,extent[1]*1.8):extent[1]*1.8]:[Math.min(0,extent[0]),extent[1]*1.08]).range(scale.complement?[margin.top,height-margin.bottom]:[height-margin.bottom,margin.top]);
 surface.style.aspectRatio=`${width}/${height}`;
 const canvas=document.createElement('canvas');canvas.className='timeline-canvas';canvas.setAttribute('aria-hidden','true');surface.append(canvas);
 const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
 const ctx=canvas.getContext('2d');
 const svg=d3.select(surface).append('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('preserveAspectRatio','none').attr('class','timeline-svg').attr('role','img').attr('aria-label',`${metric.label} versus paper year${scale.complement?'; logarithmic distance from perfect fidelity':''}; select points or draw a lasso`);
 svg.append('defs').append('clipPath').attr('id','plot-clip').append('rect').attr('x',margin.left).attr('y',margin.top).attr('width',width-margin.left-margin.right).attr('height',height-margin.top-margin.bottom);
 const axisX=svg.append('g').attr('class','axis x-axis').attr('transform',`translate(0,${height-margin.bottom})`),axisY=svg.append('g').attr('class','axis y-axis').attr('transform',`translate(${margin.left},0)`),grid=svg.append('g').attr('class','grid').attr('transform',`translate(${margin.left},0)`);
 svg.append('text').attr('class','axis-title').attr('x',width/2).attr('y',height-10).attr('text-anchor','middle').text('Paper year');
 svg.append('text').attr('class','axis-title value-axis-title').attr('transform','rotate(-90)').attr('x',-height/2).attr('y',20).attr('text-anchor','middle').text(scale.axisLabel);
 const drawing=svg.append('g').attr('clip-path','url(#plot-clip)');
 const envelope=frontier(frontierInputs,metric.direction),line=drawing.append('path').attr('class','frontier-line');
 let scaleNote=scale.complement?`Log axis uses the remaining gap, 1 − F (F = fidelity${metric.unit==='%'?' / 100':''}). Ticks show fidelity${metric.unit==='%'?' in %':''}; higher fidelity is higher on the plot.`:log?'Log scale omits zero and negative values; switch to linear to include them.':'Linear axis shows the original metric values.';
 if(omittedAtLimit)scaleNote+=` ${omittedAtLimit} reported ${scale.limit}${metric.unit==='%'?'%':''} values have zero gap and are omitted; switch to linear to show them.`;
 if(scale.complement&&omittedOther)scaleNote+=` ${omittedOther} values outside the fidelity range are also omitted.`;
 if(scale.complement&&envelope.some(p=>!scale.plottable(p.value)))scaleNote+=' The frontier stops at an omitted ideal-limit record.';
 // Cache projection and colors once. Zoom redraws no per-point DOM nodes.
 const projected=all.map(p=>({p,x:x0(p.year),y:y0(scale.axisValue(p.value)),color:color.color(devices[p.device])}));
 const tree=d3.quadtree(projected,p=>p.x,p=>p.y);
 const batches=new Map();
 for(const q of projected){const key=[q.color,q.p.eligible,['exact','approximate','with_uncertainty'].includes(q.p.nature)].join('|');if(!batches.has(key))batches.set(key,[]);batches.get(key).push(q);}
 const lasso=svg.append('path').attr('class','lasso-path').attr('pointer-events','none');
 const tip=document.createElement('div');tip.className='graph-tooltip';tip.hidden=true;container.append(tip);
 function position(p){return [transform.applyX(x0(p.year)),transform.applyY(y0(scale.axisValue(p.value)))];}
 function inPlot([x,y]){return x>=margin.left&&x<=width-margin.right&&y>=margin.top&&y<=height-margin.bottom;}
 function hit(event){const xy=d3.pointer(event,svg.node());if(!inPlot(xy))return;const local=transform.invert(xy);return tree.find(local[0],local[1],7/transform.k)?.p;}
 function paint(){
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);ctx.save();
  ctx.beginPath();ctx.rect(margin.left,margin.top,width-margin.left-margin.right,height-margin.top-margin.bottom);ctx.clip();
  for(const batch of batches.values())for(const active of (selected.size?[false,true]:[false])){
   const first=batch[0],r=active?5:3.5;ctx.beginPath();let count=0;
   for(const q of batch){if(selected.size&&selected.has(q.p.id)!==active)continue;const x=transform.applyX(q.x),y=transform.applyY(q.y);if(x<margin.left-r||x>width-margin.right+r||y<margin.top-r||y>height-margin.bottom+r)continue;ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);count++;}
   if(!count)continue;ctx.globalAlpha=selected.size?(active?.9:.13):.72;ctx.fillStyle=first.p.eligible?first.color:'#f7f8f3';ctx.strokeStyle=first.color;ctx.lineWidth=active?1.8:.9;ctx.setLineDash(['exact','approximate','with_uncertainty'].includes(first.p.nature)?[]:[2,2]);ctx.fill();ctx.stroke();
  }
  ctx.restore();
 }
 svg.on('pointermove.hover',event=>{if(dragging){tip.hidden=true;return;}const p=hit(event);if(!p){tip.hidden=true;return;}tip.innerHTML=`<strong>${esc(devices[p.device].label)}</strong><span>${fmt(p.value)} ${esc(metric.unit)} · ${p.year}<br>${esc(p.name)} · ${esc(p.text)}${devices[p.device].review?'<br>Review flagged; excluded from frontier':''}${p.audit?'<br>PDF audit: '+esc(auditLabel(p.audit.action)):''}</span>`;tip.hidden=false;const r=container.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(r.width-300,event.clientX-r.left+12))+'px';tip.style.top=Math.max(8,event.clientY-r.top-70)+'px';}).on('pointerleave.hover',()=>tip.hidden=true).on('click.select',event=>{if(dragging||event.defaultPrevented)return;const p=hit(event);if(!p)return;event.stopPropagation();if(!event.shiftKey)selected.clear();selected.has(p.id)?selected.delete(p.id):selected.add(p.id);highlight();onSelect(p);});
 function scales(){return [transform.rescaleX(x0),transform.rescaleY(y0)];}
 function draw(){
  if(disposed)return;
  const [x,y]=scales(),domain=x.domain();
  let yearTicks=hasYears?x.ticks(Math.min(10,(width-100)/65)).filter(year=>Number.isInteger(year)&&year>=years[0]&&year<=years[1]):[];
  // Label the data endpoints when visible, leaving room for readable years.
  if(hasYears)for(const year of new Set(years))if(year>=domain[0]&&year<=domain[1]){
   yearTicks=yearTicks.filter(tick=>Math.abs(x(tick)-x(year))>=40);
   yearTicks.push(year);
  }
  yearTicks.sort((a,b)=>a-b);
  axisX.call(d3.axisBottom(x).tickValues(yearTicks).tickFormat(d3.format('d')));
  axisY.call(scale.complement?d3.axisLeft(y).ticks(7).tickFormat(y.tickFormat(7,scale.tick)):d3.axisLeft(y).ticks(7,log?'.2~g':'.3~g'));
  grid.call(d3.axisLeft(y).ticks(7).tickSize(-(width-margin.left-margin.right)).tickFormat(''));
  paint();
  line.attr('d',d3.line().defined(p=>scale.plottable(p.value)).curve(d3.curveStepAfter).x(p=>x(p.year)).y(p=>y(scale.axisValue(p.value)))(frontierTrace(envelope,domain[1],scale)));
 }
 // Coalesce wheel/pointer bursts into one screen update per animation frame.
 function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
 function highlight(){schedule();onSelection(all.filter(p=>selected.has(p.id)));}
 // Keep navigation within the full data view, including at minimum zoom.
 const plotExtent=[[margin.left,margin.top],[width-margin.right,height-margin.bottom]];
 const zoom=d3.zoom().extent(plotExtent).translateExtent(plotExtent).scaleExtent([1,25]).filter(event=>event.type==='wheel'||(mode==='pan'&&!event.button)).on('zoom',event=>{transform=event.transform;tip.hidden=true;schedule();});
 svg.call(zoom).on('dblclick.zoom',null);
 svg.on('pointerdown.lasso',event=>{if(mode!=='lasso'||event.button!==0||hit(event))return;const p=d3.pointer(event,svg.node());if(!inPlot(p))return;dragging=true;polygon=[p];tip.hidden=true;svg.node().setPointerCapture(event.pointerId);if(!event.shiftKey)selected.clear();});
 svg.on('pointermove.lasso',event=>{if(!dragging)return;polygon.push(d3.pointer(event,svg.node()));lasso.attr('d',d3.line()(polygon)+'Z');});
 svg.on('pointerup.lasso',event=>{if(!dragging)return;if(polygon.length>2)for(const p of all)if(pointInPolygon(position(p),polygon))selected.add(p.id);lasso.attr('d',null);highlight();setTimeout(()=>dragging=false,0);if(svg.node().hasPointerCapture(event.pointerId))svg.node().releasePointerCapture(event.pointerId);});
 if(!all.length)svg.append('text').attr('x',width/2).attr('y',height/2).attr('text-anchor','middle').attr('class','empty-plot').text(omittedAtLimit?'No finite log gaps; switch to linear to show ideal-limit values.':'No reported values match these filters.');
 const observer=new ResizeObserver(()=>{
  const nextWidth=Math.max(280,container.clientWidth),nextHeight=Math.max(160,container.clientHeight||570);
  if(disposed||nextWidth===width&&nextHeight===height)return;
  width=nextWidth;height=nextHeight;surface.style.aspectRatio=`${width}/${height}`;
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);svg.attr('viewBox',`0 0 ${width} ${height}`);
  svg.select('#plot-clip rect').attr('width',width-margin.left-margin.right).attr('height',height-margin.top-margin.bottom);
  axisX.attr('transform',`translate(0,${height-margin.bottom})`);
  svg.select('.axis-title:not(.value-axis-title)').attr('x',width/2).attr('y',height-10);svg.select('.value-axis-title').attr('x',-height/2);
  x0.range([margin.left,width-margin.right]);y0.range(scale.complement?[margin.top,height-margin.bottom]:[height-margin.bottom,margin.top]);
  tree.removeAll(projected);for(const q of projected){q.x=x0(q.p.year);q.y=y0(scale.axisValue(q.p.value));}tree.addAll(projected);
  plotExtent[1]=[width-margin.right,height-margin.bottom];zoom.extent(plotExtent).translateExtent(plotExtent);
  tip.hidden=true;schedule();
 });observer.observe(container);
 draw();
 return {count:all.length,frontierCount:envelope.length,encoding:color,scale:{type:scale.type,limit:scale.limit,omittedAtLimit,omittedOther},scaleNote,
  setMode(value){mode=value;container.dataset.mode=mode;},
  reset(){svg.call(zoom.transform,d3.zoomIdentity);},
  clear(){selected.clear();highlight();},
  toggle(p,on){on?selected.add(p.id):selected.delete(p.id);highlight();},
  all:()=>all,selected:()=>all.filter(p=>selected.has(p.id)),position,
  view:()=>({x:scales()[0].domain(),y:scales()[1].domain(),years,transform:{x:transform.x,y:transform.y,k:transform.k}}),
  export(){const subset=selected.size?all.filter(p=>selected.has(p.id)):all;download('sqbits-'+metric.id+'.csv',toCSV(subset.map(p=>{const d=devices[p.device],paper=papers[d.paper];return {device:d.label,device_id:d.id,paper:paper.label,year:d.year,doi:paper.doi,value:p.value,unit:metric.unit,reported:p.text,reported_name:p.name,configuration:p.configuration,conditions:p.conditions,origin:p.origin,nature:p.nature,review_flag:d.review,audit_status:p.audit?.action||'not_audited',original_value:p.rawValue??p.value,original_display_unit:metric.unit,original_origin:p.rawOrigin??p.origin,original_nature:p.rawNature??p.nature,original_attribution:d.attribution,source_metric:p.sourceMetric||metric.id,audit_reason:p.audit?.reason||'',audit_page:p.audit?.page??'',audit_quote:p.audit?.quote||'',source_url:paper.url};})));},
  destroy(){disposed=true;observer.disconnect();if(frame)cancelAnimationFrame(frame);svg.on('.lasso',null).on('.zoom',null).on('.hover',null).on('.select',null);surface.remove();tip.remove();},
 };
}
