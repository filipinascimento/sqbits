import test from 'node:test';import assert from 'node:assert/strict';
import {createSeriesStyles,seriesPalette} from '../src/chart-colors.js';
const luminance=hex=>[.2126,.7152,.0722].reduce((sum,weight,i)=>{const value=parseInt(hex.slice(1+i*2,3+i*2),16)/255;return sum+weight*(value<=.04045?value/12.92:((value+.055)/1.055)**2.4);},0);
test('every series color is visible on the light plotting backgrounds',()=>{
 for(const background of ['#fffefa','#f8f8f3','#f4f6f2'])for(const color of seriesPalette)assert.ok((luminance(background)+.05)/(luminance(color)+.05)>=4.5,`${color} on ${background}`);
});
test('the fabrication categories in the reported regression have distinct colors',()=>{
 const categories=['deposition','lithography','etching','other','cleaning','lift_off'],styles=createSeriesStyles(categories);styles.sync(categories);
 assert.equal(new Set(categories.map(c=>styles.get(c).color)).size,6);assert.notEqual(styles.get('lithography').color,styles.get('lift_off').color);
});
test('returning categories cannot collide with the current 12 series or recolor retained series',()=>{
 const categories=Array.from({length:30},(_,i)=>'category '+i),styles=createSeriesStyles(categories);styles.sync(categories.slice(0,12));
 for(let offset=1;offset<19;offset++){
  const keep=categories.slice(offset,offset+11),before=keep.map(c=>styles.get(c)),next=categories.slice(offset,offset+12);styles.sync(next);
  assert.deepEqual(keep.map(c=>styles.get(c)),before);assert.equal(new Set(next.map(c=>styles.get(c).color)).size,12);
 }
 const next=categories.slice(0,12);styles.sync(next);const before=next.map(c=>styles.get(c));styles.sync([...next].reverse());assert.deepEqual(next.map(c=>styles.get(c)),before);
});
