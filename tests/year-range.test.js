import test from 'node:test';import assert from 'node:assert/strict';
import {yearExtent,clampYearRange,panYearRange} from '../src/year-range.js';
test('year bounds come from dated records and preserve a single observed year',()=>{
 assert.deepEqual(yearExtent([{year:null},{year:2026},{year:1988},{year:2022.5}]),[1988,2026]);
 assert.deepEqual(yearExtent([{year:2022}]),[2022,2022]);assert.equal(yearExtent([{year:null}]),null);
});
test('year ranges snap to whole years, admit a single year and stay within the snapshot',()=>{
 const extent=[1988,2026];assert.deepEqual(clampYearRange(['',undefined],extent),extent);
 assert.deepEqual(clampYearRange([2022,2022],extent),[2022,2022]);assert.deepEqual(clampYearRange([2020.8,2000.2],extent),[2000,2021]);
 assert.deepEqual(clampYearRange([1900,2030],extent),extent);
});
test('panning preserves interval width at both boundaries and can move a single year',()=>{
 const extent=[1988,2026];assert.deepEqual(panYearRange([2000,2010],3,extent),[2003,2013]);
 assert.deepEqual(panYearRange([2000,2010],100,extent),[2016,2026]);assert.deepEqual(panYearRange([2000,2010],-100,extent),[1988,1998]);
 assert.deepEqual(panYearRange(extent,10,extent),extent);assert.deepEqual(panYearRange([2022,2022],-2,extent),[2020,2020]);
});
