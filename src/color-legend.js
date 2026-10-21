import {esc} from './data.js';

export function colorLegendHTML(enc){
 const swatches=items=>items.map(l=>`<span title="${esc(l.label)}"><i style="background:${l.color}"></i>${esc(l.label)}</span>`).join('');
 if(!enc.numeric)return swatches(enc.legend.slice(0,12))+(enc.legend.length>12?`<span class="muted">+ ${enc.legend.length-12} categories; use the filters to explore</span>`:'');
 const bar=enc.colorbar;
 return (bar?`<div class="numeric-color-legend" data-scale="${esc(bar.type)}"><div class="colorbar-title"><strong>${esc(bar.title)}</strong><span>${esc(bar.scaleLabel)}</span></div><svg class="colorbar" viewBox="0 0 400 34" role="img" aria-label="${esc(bar.title+' · '+bar.scaleLabel)}"><defs><linearGradient id="sqbits-color-ramp">${bar.stops.map(s=>`<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('')}</linearGradient></defs><rect x="20" y="2" width="360" height="9" fill="url(#sqbits-color-ramp)" stroke="#758079" stroke-width=".5"/>${bar.ticks.map(t=>`<g class="colorbar-tick" data-value="${t.value}" data-offset="${t.offset}" transform="translate(${20+360*t.offset},0)"><line y1="11" y2="16" stroke="#758079"/><text y="29" text-anchor="${t.offset<.01?'start':t.offset>.99?'end':'middle'}">${esc(t.label)}</text></g>`).join('')}</svg></div>`:'<span class="muted">No values with a finite color scale.</span>')+`<div class="colorbar-specials">${swatches(enc.legend)}</div>`;
}
