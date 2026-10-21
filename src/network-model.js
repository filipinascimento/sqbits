// Native Helios rules operate on attributes of the complete, stable network.
export function networkFilterRules(filters={}){
 const rules=[];
 const add=(type,attribute,extra)=>rules.push({type,scope:'node',attribute:'sq_'+attribute,...extra});
 if(!filters.includeIsolates&&String(filters.community)!=='0')add('numeric','degree',{min:1,max:Number.MAX_SAFE_INTEGER});
 for(const key of ['community','type','scope','realization','attribution','material','substrate','geometry','review'])
  if(filters[key])add('categorical',key,{values:[String(filters[key])]});
 if(filters.search?.trim())add('string','search',{operator:'contains',value:filters.search.trim().toLowerCase()});
 if(filters.yearMin||filters.yearMax)add('numeric','year',{min:filters.yearMin?+filters.yearMin:-1e9,max:filters.yearMax?+filters.yearMax:1e9});
 return rules;
}

// Degree centrality in each community's induced graph. Citation edges count
// both endpoints; device similarities contribute their original edge weights.
// Rank once on the complete graph, then choose the highest-ranked visible node.
export function communityRanks(nodes,edges,directed){
 const lookup=new Map(nodes.map((n,i)=>[n.id,i])),strength=new Float64Array(nodes.length);
 for(const e of edges){const a=lookup.get(e.source),b=lookup.get(e.target);
  if(a==null||b==null||a===b||nodes[a].community!==nodes[b].community)continue;
  const w=directed?1:Number(e.weight??1);if(!Number.isFinite(w)||w<=0)continue;
  strength[a]+=w;strength[b]+=w;
 }
 const ranks=new Map();nodes.forEach((n,i)=>{if(!n.community)return;if(!ranks.has(n.community))ranks.set(n.community,[]);ranks.get(n.community).push({node:n,strength:strength[i]});});
 for(const group of ranks.values())group.sort((a,b)=>b.strength-a.strength||String(a.node.id).localeCompare(String(b.node.id)));
 return ranks;
}
