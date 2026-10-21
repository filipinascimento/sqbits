#!/usr/bin/env python3
"""Publish derived, traceable SQbits data; never modifies extraction outputs."""
from __future__ import annotations
import argparse, collections, concurrent.futures, gzip, hashlib, json, math, random, re, time
from pathlib import Path
import igraph as ig
import pyarrow.parquet as pq

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'pipeline_refresh/reports/device_extraction/nanoscope_full_luna_20261016_run1'
INDEX=ROOT/'pipeline_refresh/reports/pdf_acquisition/sq_v4_frozen_20260915/pdf_dimensions_index_after_manual_import_20261006_run1/consolidated_pdf_work_index.parquet'
NETWORK=ROOT/'pipeline_refresh/data/quantum_computing/quantum_computing_hybrid_v4_dimensions_20251124_run2/network_xnet'
STOP=set('a an and are as at be by can circuit circuits design device devices effect effects for from in into is it of on or quantum qubit qubits superconducting system systems the their these this to using use used via with we study based high low new control coupled'.split())
METRICS={
 't1':('Energy relaxation · T₁','µs',1e6,'max'),'t2_ramsey':('Ramsey coherence · T₂*','µs',1e6,'max'),
 't2_echo':('Echo coherence · T₂ echo','µs',1e6,'max'),'t2_other':('Other coherence · T₂','µs',1e6,'max'),
 'tphi':('Pure dephasing · Tφ','µs',1e6,'max'),
 'single_qubit_gate_fidelity':('Single-qubit gate fidelity','%',100,'max'),
 'two_qubit_gate_fidelity':('Two-qubit gate fidelity','%',100,'max'),
 'single_qubit_gate_error':('Single-qubit gate error','%',100,'min'),
 'two_qubit_gate_error':('Two-qubit gate error','%',100,'min'),
 'single_qubit_gate_time':('Single-qubit gate duration','ns',1e9,'min'),
 'two_qubit_gate_time':('Two-qubit gate duration','ns',1e9,'min'),
 'readout_fidelity':('Readout fidelity','%',100,'max'),'readout_error':('Readout error','%',100,'min'),
 'readout_time':('Readout duration','ns',1e9,'min'),
 'qubit_frequency':('Qubit transition frequency','GHz',1e-9,'envelope'),
 'resonator_frequency':('Resonator frequency','GHz',1e-9,'envelope'),
 'resonator_qi':('Resonator internal Q','1',1,'max'),'resonator_q_loaded':('Resonator loaded Q','1',1,'max'),
 'tls_loss':('TLS loss','1',1,'min'),'logical_error':('Logical error','1',1,'min'),
 'qubit_count':('Reported qubit count','qubits',1,'max'),
 'resonator_linewidth':('Resonator linewidth','MHz',1e-6,'min')}
UNITS={k:('s' if v[1] in {'µs','ns'} else 'Hz' if v[1] in {'GHz','MHz'} else '1') for k,v in METRICS.items()}

def dump(path,value):
 path.parent.mkdir(parents=True,exist_ok=True)
 raw=json.dumps(value,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode()
 if path.suffix=='.gz': path.write_bytes(gzip.compress(raw,compresslevel=6,mtime=0))
 else: path.write_bytes(raw)

def words(text):
 return [x for x in re.findall(r'[a-z][a-z0-9-]{1,}',text.lower()) if x not in STOP]

def read_segment(item):
 paper,segment=item
 return paper,segment,json.loads(Path(segment['recordset_path']).read_text())

def observations(record): return record.get('outcomes',[])+record.get('design_choices',[])

def category(record,prop):
 vals=[o['reported_text'] for o in record['design_choices'] if o['property_name']==prop]
 return vals[0][:160] if vals else 'Unknown'

def features(record):
 result=set()
 if record['qubit_type'] not in {'Unknown','not_a_qubit'}: result.add('type:'+record['qubit_type'])
 if record['geometry']!='Unknown': result.add('geometry:'+record['geometry'])
 for o in record['design_choices']:
  prop=o['property_name'];q=o.get('quantity');norm=o.get('normalized')
  if q and norm and norm.get('status')=='converted' and isinstance(norm.get('value'),(float,int)):
   value=norm['value']
   if value>0 and math.isfinite(value): result.add(prop+':bin'+str(round(math.log10(value)*3)))
  elif prop in {'superconductor_composition','substrate_material','junction_stack','junction_geometry','capacitor_geometry','junction_fabrication_method','surface_treatment','coupling_mechanism','coupling_tunability','film_crystallinity','layout_topology','vortex_pinning'}:
   for token in words(o['reported_text'])[:12]: result.add(prop+':'+token)
 return sorted(result)

def communities(n,edges,texts,weighted=False):
 graph=ig.Graph(n=n,edges=[e[:2] for e in edges],directed=False)
 if weighted:graph.es['weight']=[e[2] for e in edges]
 graph.simplify(combine_edges='max')
 active=[i for i,d in enumerate(graph.degree()) if d]
 ids=[0]*n;labels={0:'No indexed connections'}
 groups=[]
 if active:
  sub=graph.induced_subgraph(active)
  part=sub.community_leiden(objective_function='modularity',resolution=1,n_iterations=5,weights=sub.es['weight'] if weighted else None)
  groups=sorted(part,key=lambda x:(-len(x),min(x)))
  for group_id,members in enumerate(groups,1):
   for i in members: ids[active[i]]=group_id
  counts=collections.Counter(t for text in texts for t in set(words(text)))
  for group_id,members in enumerate(groups,1):
   terms=collections.Counter(t for i in members for t in words(texts[active[i]]))
   ranked=sorted(terms,key=lambda t:terms[t]*math.log(1+n/(1+counts[t])),reverse=True)
   labels[group_id]=f'C{group_id:02d} · '+(' · '.join(t.replace('-',' ').capitalize() for t in ranked[:3]) or 'Small connected group')
 return graph,ids,labels

def save_xnet(path,nodes,edges,directed):
 with path.open('w') as f:
  weighted=bool(edges and len(edges[0])==3)
  f.write(f'#vertices {len(nodes)}\n#edges {"weighted" if weighted else "nonweighted"} {"directed" if directed else "undirected"}\n')
  for a,b,*weight in edges: f.write(f'{a} {b}'+(f' {weight[0]}' if weighted else '')+'\n')
  for key in ['id','label','communityLabel']:
   f.write(f'#v "{key}" s\n')
   for node in nodes: f.write(json.dumps(str(node.get(key,'')),ensure_ascii=False)+'\n')

def main():
 global SOURCE,INDEX,NETWORK
 parser=argparse.ArgumentParser();parser.add_argument('--source-root',type=Path,default=ROOT);parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'public/data')
 args=parser.parse_args();out=args.output;out.mkdir(parents=True,exist_ok=True)
 SOURCE=args.source_root/SOURCE.relative_to(ROOT);INDEX=args.source_root/INDEX.relative_to(ROOT);NETWORK=args.source_root/NETWORK.relative_to(ROOT)
 t=time.time();manifest=json.loads((SOURCE/'extraction_manifest.json').read_text())
 meta={r['work_key']:r for r in pq.read_table(INDEX,columns=['work_key','dimensions_ids','primary_publication_doi','arxiv_numeric_ids']).to_pylist()}
 papers=[];devices=[];measurements=collections.defaultdict(list);details=collections.defaultdict(dict)
 inputs=[(p,s) for p in manifest for s in p['segments']]
 paper_index={p['work_key']:i for i,p in enumerate(manifest)}
 for p in manifest:
  m=meta.get(p['work_key'],{});doi=m.get('primary_publication_doi')
  url='https://doi.org/'+doi if doi else 'https://arxiv.org/abs/'+m.get('arxiv_numeric_ids',[''])[0] if m.get('arxiv_numeric_ids') else ''
  papers.append(dict(id=p['work_key'],label=p['title'],year=p.get('year'),doi=doi,url=url,
    review=any(s['review_flags'] for s in p['segments']),segmented=len(p['segments'])>1,devices=0))
 with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
  for p,s,rs in pool.map(read_segment,inputs):
   pi=paper_index[p['work_key']];flags=s['review_flags'];papers[pi]['devices']+=len(rs['records'])
   for ri,r in enumerate(rs['records']):
    di=len(devices);uid=f'{s["custom_id"]}:{ri}'
    d=dict(id=uid,paper=pi,label=r['reported_device_name'],sourceId=r['device_id'],type=r['qubit_type'],
      attribution=r['attribution'],realization=r['realization'],scope=r['entity_scope'],geometry=r['geometry'],
      year=p.get('year'),material=category(r,'superconductor_composition'),substrate=category(r,'substrate_material'),
      junction=category(r,'junction_stack'),review=bool(flags),features=features(r),best={})
    for oi,o in enumerate(observations(r)):
     prop=o['property_name'];norm=o.get('normalized');q=o.get('quantity')
     if prop not in METRICS or not q or not norm or norm.get('status')!='converted' or norm.get('unit')!=UNITS[prop]: continue
     value=norm.get('value')
     if value is None or not math.isfinite(value) or value<0: continue
     metric=METRICS[prop];v=value*metric[2]
     if o['origin']=='measured' and q['nature'] in {'exact','approximate','with_uncertainty'} and (prop not in d['best'] or (v<d['best'][prop] if metric[3]=='min' else v>d['best'][prop])): d['best'][prop]=v
     eligible=(q['nature'] in {'exact','approximate','with_uncertainty'} and not flags and o['origin']=='measured')
     measurements[prop].append(dict(id=f'{di}:{oi}',device=di,value=v,origin=o['origin'],nature=q['nature'],
       name=o['reported_name'],text=q['text'],configuration=o.get('configuration_id'),
       conditions=o.get('conditions'),component=o.get('component'),eligible=eligible,
       minus=(norm.get('uncertainty_minus') or 0)*metric[2],plus=(norm.get('uncertainty_plus') or 0)*metric[2]))
    devices.append(d)
    # Full original scientific record + shared recipes, fetched only on inspection.
    details[p['work_key'][:2]][uid]=dict(record=r,fabrication_processes=[f for f in rs['fabrication_processes'] if f['process_id'] in r['fabrication_process_ids']],
      document_notes=rs['document_notes'],review_flags=flags,source_page_start=s['start_page'],source_page_end=s['end_page'])
 print(json.dumps(dict(stage='science',papers=len(papers),devices=len(devices),seconds=time.time()-t)),flush=True)
 # Fold article/preprint manifestations by the frozen canonical-work mapping.
 pub_to_paper={pub:paper_index[p['work_key']] for p in manifest for pub in meta.get(p['work_key'],{}).get('dimensions_ids',[])}
 edge_rows=pq.read_table(NETWORK/'edges.parquet').to_pylist()
 citations=sorted({(pub_to_paper[a],pub_to_paper[b]) for e in edge_rows for a,b in [(e['citing_id'],e['cited_id'])] if a in pub_to_paper and b in pub_to_paper and pub_to_paper[a]!=pub_to_paper[b]})
 ig.set_random_number_generator(random.Random(42))
 pg,pc,plabel=communities(len(papers),citations,[p['label'] for p in papers])
 for i,p in enumerate(papers): p.update(community=pc[i],communityLabel=plabel[pc[i]],degree=pg.degree(i))
 print(json.dumps(dict(stage='citations',edges=len(citations),seconds=time.time()-t)),flush=True)
 # Sparse TF-IDF design fingerprints, with HNSW-free deterministic candidate
 # retrieval. Outcomes, citation proximity and missing values are never features.
 postings=collections.defaultdict(list)
 for i,d in enumerate(devices):
  for feature in d['features']:postings[feature].append(i)
 sets=[set(d['features']) for d in devices];weights={f:math.log(1+len(devices)/(1+len(ids))) for f,ids in postings.items()}
 totals=[sum(weights[f] for f in sorted(s)) for s in sets];pairs={}
 # At most 64 deterministic, uniformly sampled candidates per feature. This is
 # an approximate design-neighbor graph; it does not claim exhaustive kNN.
 samples={f:(ids if len(ids)<=64 else random.Random(f).sample(ids,64)) for f,ids in postings.items()}
 for i,features_i in enumerate(sets):
  if len(features_i)<2:continue
  candidates=set(j for f in features_i for j in samples[f] if j!=i)
  scores=[]
  for j in candidates:
   shared=features_i & sets[j]
   if len(shared)<2:continue
   overlap=sum(weights[f] for f in sorted(shared));score=overlap/(totals[i]+totals[j]-overlap)
   if score>=.22:scores.append((score,j))
  for score,j in sorted(scores,reverse=True)[:6]:
   key=(min(i,j),max(i,j));pairs[key]=round(score,4)
 similarity=[(a,b,w) for (a,b),w in sorted(pairs.items())]
 dg,dc,dlabel=communities(len(devices),similarity,[' '.join([d['type'] if d['type'] not in {'Unknown','not_a_qubit'} else '',*[f.split(':',1)[1] for f in d['features'] if not f.split(':',1)[1].startswith('bin')]]) for d in devices],True)
 dlabel[0]='Insufficient shared design evidence'
 for i,d in enumerate(devices):d.update(community=dc[i],communityLabel=dlabel[dc[i]],degree=dg.degree(i))
 print(json.dumps(dict(stage='similarity',edges=len(similarity),seconds=time.time()-t)),flush=True)
 dump(out/'papers.json.gz',dict(nodes=papers,edges=citations))
 dump(out/'devices.json.gz',dict(nodes=devices,edges=similarity))
 for key,rows in measurements.items():dump(out/'outcomes'/f'{key}.json.gz',rows)
 for prefix,rows in details.items():dump(out/'details'/f'{prefix}.json.gz',rows)
 result_dir=Path(__file__).resolve().parents[1]/'Results';result_dir.mkdir(exist_ok=True)
 save_xnet(result_dir/'papers.xnet',papers,citations,True);save_xnet(result_dir/'devices.xnet',devices,similarity,False)
 metrics=[dict(id=k,label=v[0],unit=v[1],factor=v[2],direction=v[3],count=len(measurements[k])) for k,v in METRICS.items() if measurements[k]]
 summary=dict(version='2026-10-21',papers=len(papers),devices=len(devices),citationEdges=len(citations),similarityEdges=len(similarity),
  reviewPapers=sum(p['review'] for p in papers),metrics=metrics,paperCommunities=collections.Counter(pc),deviceCommunities=collections.Counter(dc),
  citationConnectedPapers=sum(p['degree']>0 for p in papers),defaultScope='individual_qubit',
  provenance=dict(extraction='NANOSCOPE sq-inventory-0.9 / GPT-6 Luna',citationSnapshot='Dimensions 2025-11-24, QC induced graph',
   sourceManifestSha256=hashlib.sha256((SOURCE/'extraction_manifest.json').read_bytes()).hexdigest(),
   citationDirection='Citing paper → cited paper; manifestations folded into canonical works; self-links and duplicate links removed.',
   deviceIdentity='Segment-local records, not deduplicated across papers or PDF segments; device families and components stay separate.',
   communities='Leiden modularity on the undirected graph; labels are automatic distinctive terms, not expert-assigned taxonomy.',
   similarity='IDF-weighted Jaccard on explicitly reported design tokens and 1/3-decade numeric bins. At most 64 sampled candidates per feature; top 6 neighbors above 0.22, symmetrized. At least two shared features. Outcomes are excluded.',
   frontier='Measured own-work individual qubits by default. Only finite non-negative converted point values from measured observations; bounds/ranges, non-measured origins and review-flagged segments cannot set the frontier. Logarithmic axes hide zero values. Max/min envelope over the active filters; protocols remain distinct. Not an independently validated world record.'))
 dump(out/'summary.json',summary);dump(result_dir/'build_report.json',summary)
 print(json.dumps(dict(stage='done',seconds=time.time()-t,**{k:summary[k] for k in ['papers','devices','citationEdges','similarityEdges']})),flush=True)

if __name__=='__main__':main()
