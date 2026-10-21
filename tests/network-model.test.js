import test from 'node:test';import assert from 'node:assert/strict';
import {communityRanks,networkFilterRules} from '../src/network-model.js';
test('community representatives favor internal degree, not a bridge with many external links',()=>{
 const nodes=[{id:'bridge',community:1,degree:30},{id:'core',community:1,degree:3},{id:'a',community:1,degree:1},{id:'b',community:1,degree:1},{id:'external',community:2,degree:30}];
 const edges=[['bridge','core'],['core','a'],['core','b'],['bridge','external'],['bridge','external']].map(([source,target])=>({source,target}));
 const rank=communityRanks(nodes,edges,true).get(1);assert.equal(rank[0].node.id,'core');assert.equal(rank[0].strength,3);assert.equal(rank.find(r=>r.node.id==='bridge').strength,1);
});
test('similarity representatives use weights and stable ID ties rather than total degree',()=>{
 const nodes=[{id:'x',community:1},{id:'a',community:1},{id:'b',community:1},{id:'c',community:1}];
 const edges=[{source:'x',target:'a',weight:.1},{source:'x',target:'b',weight:.1},{source:'a',target:'c',weight:.9}];
 assert.equal(communityRanks(nodes,edges,false).get(1)[0].node.id,'a');
 assert.equal(communityRanks(nodes,[],false).get(1)[0].node.id,'a');
});
test('year, classification, review and search compile into native Helios node rules',()=>{
 const rules=networkFilterRules({yearMin:2020,yearMax:2024,type:'fluxonium',review:'flagged',search:'Junction (Al)'});
 assert.equal(rules.find(r=>r.attribute==='sq_year').min,2020);assert.equal(rules.find(r=>r.attribute==='sq_year').max,2024);assert.deepEqual(rules.find(r=>r.attribute==='sq_type').values,['fluxonium']);assert.equal(rules.find(r=>r.attribute==='sq_search').value,'junction (al)');assert.ok(rules.every(r=>r.scope==='node'));
 assert.equal(networkFilterRules({includeIsolates:true}).length,0);assert.equal(networkFilterRules({community:'0'}).some(r=>r.attribute==='sq_degree'),false);
});
