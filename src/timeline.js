import * as d3 from 'd3';
import {encoding,frontier,pointInPolygon,fmt,esc,pretty,toCSV,download} from './data.js';

export function mountTimeline(container,{points,metric,devices,papers,colorBy,onSelect,onSelection,log=true}){
 let selected=new Set(),mode='lasso',transform=d3.zoomIdentity,polygon=[],dragging=false,disposed=false;
 const width=Math.max(460,container.clientWidth),height=570,margin={top:35,right:28,bottom:58,left:82};
 const available=points.filter(p=>!log||p.value>0);
 const all=available.map(p=>({...p,year:devices[p.device].year})).filter(p=>Number.isFinite(p.year));
 const color=encoding([...new Set(all.map(p=>p.device))].map(i=>devices[i]),colorBy);
 const years=d3.extent(all,d=>d.year);if(years[0]===years[1]){years[0]-=1;years[1]+=1;}
 const x0=d3.scaleLinear().domain(all.length?[years[0]-.7,years[1]+.7]:[1990,2026]).range([margin.left,width-margin.right]);
 let extent=d3.extent(all,d=>d.value);if(!all.length)extent=[1,10];if(extent[0]===extent[1])extent=[extent[0]*.8||.1,extent[1]*1.2||1];
 const y0=(log?d3.scaleLog():d3.scaleLinear()).domain(log?[extent[0]/1.8,extent[1]*1.8]:[Math.min(0,extent[0]),extent[1]*1.08]).range([height-margin.bottom,margin.top]);
 const svg=d3.select(container).append('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('class','timeline-svg').attr('role','img').attr('aria-label',`${metric.label} versus paper year; select points or draw a lasso`);
 svg.append('defs').append('clipPath').attr('id','plot-clip').append('rect').attr('x',margin.left).attr('y',margin.top).attr('width',width-margin.left-margin.right).attr('height',height-margin.top-margin.bottom);
 const axisX=svg.append('g').attr('class','axis').attr('transform',`translate(0,${height-margin.bottom})`),axisY=svg.append('g').attr('class','axis').attr('transform',`translate(${margin.left},0)`),grid=svg.append('g').attr('class','grid').attr('transform',`translate(${margin.left},0)`);
 svg.append('text').attr('class','axis-title').attr('x',width/2).attr('y',height-10).attr('text-anchor','middle').text('Paper year');
 svg.append('text').attr('class','axis-title').attr('transform','rotate(-90)').attr('x',-height/2).attr('y',20).attr('text-anchor','middle').text(`${metric.label} (${metric.unit})`);
 const drawing=svg.append('g').attr('clip-path','url(#plot-clip)');
 const envelope=frontier(all,metric.direction),line=drawing.append('path').attr('class','frontier-line');
 const dots=drawing.append('g').selectAll('circle').data(all).join('circle').attr('r',3.5).attr('fill',p=>!p.eligible?'#f7f8f3':color.color(devices[p.device])).attr('stroke',p=>color.color(devices[p.device])).attr('stroke-width',.9).attr('stroke-dasharray',p=>['exact','approximate','with_uncertainty'].includes(p.nature)?null:'2 2').attr('opacity',.72).attr('class','outcome-dot').attr('data-id',p=>p.id);
 const lasso=svg.append('path').attr('class','lasso-path').attr('pointer-events','none');
 const tip=document.createElement('div');tip.className='graph-tooltip';tip.hidden=true;container.append(tip);
 dots.on('pointerenter',(event,p)=>{if(dragging)return;tip.innerHTML=`<strong>${esc(devices[p.device].label)}</strong><span>${fmt(p.value)} ${esc(metric.unit)} · ${p.year}<br>${esc(p.name)} · ${esc(p.text)}${devices[p.device].review?'<br>Review flagged; excluded from frontier':''}</span>`;tip.hidden=false;const r=container.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(r.width-300,event.clientX-r.left+12))+'px';tip.style.top=Math.max(8,event.clientY-r.top-70)+'px';}).on('pointerleave',()=>tip.hidden=true).on('click',(event,p)=>{if(dragging)return;event.stopPropagation();if(!event.shiftKey)selected.clear();selected.has(p.id)?selected.delete(p.id):selected.add(p.id);highlight();onSelect(p);});
 function scales(){return [transform.rescaleX(x0),transform.rescaleY(y0)];}
 function draw(){if(disposed)return;const [x,y]=scales();axisX.call(d3.axisBottom(x).ticks(Math.min(10,(width-100)/65)).tickFormat(d3.format('d')));axisY.call(d3.axisLeft(y).ticks(7,log?'.2~g':'.3~g'));grid.call(d3.axisLeft(y).ticks(7).tickSize(-(width-margin.left-margin.right)).tickFormat(''));dots.attr('cx',p=>x(p.year)).attr('cy',p=>y(p.value));let pathPoints=envelope;if(envelope.length)pathPoints=[...envelope,{...envelope.at(-1),year:x.domain()[1]}];line.attr('d',d3.line().curve(d3.curveStepAfter).x(p=>x(p.year)).y(p=>y(p.value))(pathPoints));}
 function highlight(){dots.attr('opacity',p=>(!selected.size||selected.has(p.id)) ? 0.9 : 0.13).attr('r',p=>selected.has(p.id)?5:3.5).attr('stroke-width',p=>selected.has(p.id)?1.8:.9);onSelection(all.filter(p=>selected.has(p.id)));}
 const zoom=d3.zoom().scaleExtent([.7,25]).filter(event=>event.type==='wheel'||(mode==='pan'&&!event.button)).on('zoom',event=>{transform=event.transform;draw();});
 svg.call(zoom).on('dblclick.zoom',null);
 svg.on('pointerdown.lasso',event=>{if(mode!=='lasso'||event.button!==0||event.target.closest('.outcome-dot'))return;const p=d3.pointer(event,svg.node());if(p[0]<margin.left||p[1]>height-margin.bottom)return;dragging=true;polygon=[p];tip.hidden=true;svg.node().setPointerCapture(event.pointerId);if(!event.shiftKey)selected.clear();});
 svg.on('pointermove.lasso',event=>{if(!dragging)return;polygon.push(d3.pointer(event,svg.node()));lasso.attr('d',d3.line()(polygon)+'Z');});
 svg.on('pointerup.lasso',event=>{if(!dragging)return;const [x,y]=scales();if(polygon.length>2)for(const p of all)if(pointInPolygon([x(p.year),y(p.value)],polygon))selected.add(p.id);lasso.attr('d',null);highlight();setTimeout(()=>dragging=false,0);if(svg.node().hasPointerCapture(event.pointerId))svg.node().releasePointerCapture(event.pointerId);});
 if(!all.length)svg.append('text').attr('x',width/2).attr('y',height/2).attr('text-anchor','middle').attr('class','empty-plot').text('No reported values match these filters.');
 draw();
 return {count:all.length,frontierCount:envelope.length,encoding:color,
  setMode(value){mode=value;container.dataset.mode=mode;},
  reset(){svg.call(zoom.transform,d3.zoomIdentity);},
  clear(){selected.clear();highlight();},
  toggle(p,on){on?selected.add(p.id):selected.delete(p.id);highlight();},
  all:()=>all,
  export(){const subset=selected.size?all.filter(p=>selected.has(p.id)):all;download('sqbits-'+metric.id+'.csv',toCSV(subset.map(p=>{const d=devices[p.device],paper=papers[d.paper];return {device:d.label,device_id:d.id,paper:paper.label,year:d.year,doi:paper.doi,value:p.value,unit:metric.unit,reported:p.text,reported_name:p.name,configuration:p.configuration,conditions:p.conditions,origin:p.origin,nature:p.nature,review_flag:d.review,source_url:paper.url};})));},
  destroy(){disposed=true;svg.on('.lasso',null).on('.zoom',null);svg.remove();tip.remove();},
 };
}
