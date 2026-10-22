#!/usr/bin/env python3
"""Build a reproducible, additive naming fix package from immutable data."""
from pathlib import Path
import collections,csv,gzip,hashlib,json,zipfile
from material_normalization import normalize,RULES
SITE=Path(__file__).resolve().parents[1]
DATA=SITE/'public/data'
OUT=DATA/'fixes/material-substrate-v1'
FIELDS={'superconductor_composition':'material','substrate_material':'substrate'}
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def read(path):return json.loads(gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_bytes())
def dump(path,value):
    b=json.dumps(value,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode()
    path.write_bytes(gzip.compress(b,mtime=0) if path.suffix=='.gz' else b)
def build():
    OUT.mkdir(parents=True,exist_ok=True)
    devices=read(DATA/'devices.json.gz')['nodes'];index=read(DATA/'design-index.json.gz');summary=read(DATA/'summary.json')
    papers=read(DATA/'papers.json.gz')['nodes']
    by_id={d['id']:(i,d) for i,d in enumerate(devices)}
    aliases={p:{} for p in FIELDS};fixes=[];pending=[];updates={};seen=collections.defaultdict(list)
    sources={f'details/{p.name}':sha(p) for p in sorted((DATA/'details').glob('*.gz'))}
    for path in sorted((DATA/'details').glob('*.gz')):
        for uid,detail in read(path).items():
            i,d=by_id[uid];paper=papers[d['paper']];first=set()
            for oi,obs in enumerate(detail['record']['design_choices']):
                prop=obs['property_name']
                if prop not in FIELDS:continue
                kind=FIELDS[prop];raw=obs['reported_text'];r=normalize(raw,kind)
                aliases[prop][raw]={'value':r.value,'rule':r.rule}
                evidence=[{**e,'source_pdf_page':e['pdf_page']+detail['source_page_start']-1} for e in obs.get('evidence',[])]
                row={'device_index':i,'device_id':uid,'paper_index':d['paper'],'paper_id':paper['id'],'paper_title':paper['label'],'paper_url':paper.get('url'),'property':prop,'design_choice_index':oi,'component':obs.get('component'),'configuration_id':obs.get('configuration_id'),'before':raw,'after':r.value,'rule':r.rule,'reason':RULES[r.rule],'source_detail':f'details/{path.name}','source_json_pointer':f'/{uid}/record/design_choices/{oi}','evidence':evidence}
                if r.rule=='unresolved':pending.append(row)
                elif r.value!=raw:fixes.append(row)
                seen[(prop,raw)].append((i,oi))
                # Keep the original first-choice metadata semantics; all choices
                # contribute to grouped distributions, including later components.
                if kind not in first:
                    first.add(kind)
                    if r.rule!='unresolved' and r.value!=d[kind]:updates.setdefault(str(i),{'id':uid})[kind]={'from':d[kind],'to':r.value,'rule':r.rule,'design_choice_index':oi}
    dictionary_maps={}
    for prop in FIELDS:
        dictionary_maps[prop]={}
        # The baseline dictionary collapses whitespace. Retain the raw string in
        # aliases/ledger and resolve dictionary keys only when every variant agrees.
        collapsed=collections.defaultdict(set)
        for raw,r in aliases[prop].items():collapsed[' '.join(raw.split()).strip()].add(r['value'])
        for i,v in enumerate(index['dictionary']):
            vals=collapsed.get(v)
            if vals and len(vals)==1:
                target=next(iter(vals))
                if target!=v:dictionary_maps[prop][str(i)]={'from':v,'to':target}
    stats={}
    for prop,kind in FIELDS.items():
        rows=[r for r in fixes if r['property']==prop];unresolved=[r for r in pending if r['property']==prop]
        old=collections.Counter(d[kind] for d in devices);new=collections.Counter(updates.get(str(i),{}).get(kind,{}).get('to',d[kind]) for i,d in enumerate(devices))
        stats[kind]={'changed_observations':len(rows),'changed_devices':sum(kind in u for u in updates.values()),'original_metadata_categories':len(old),'normalized_metadata_categories':len(new),'unresolved_observations':len(unresolved),'unresolved_descriptions':len({r['before'] for r in unresolved}),'top_normalized_metadata_categories':new.most_common(12)}
    manifest={'package_id':'material-substrate-v1','version':1,'created':'2026-10-22','method':'Deterministic controlled whole-description aliases; no LLM calls or scientific value imputation.','source_manifest_sha256':summary['provenance']['sourceManifestSha256'],'devices_sha256':sha(DATA/'devices.json.gz'),'design_index_sha256':sha(DATA/'design-index.json.gz'),'sources_sha256':sources,'rules':RULES,'summary':stats,'changes':len(fixes),'review_entries':len(pending),'policy':'Raw files remain immutable. Composition groups retain source qualifiers in the evidence ledger and original views. Unknown residue, negation, comparisons and alternatives are retained verbatim for review. Al2O3 without explicit sapphire identification is not assumed to be sapphire. First-choice network metadata semantics and frozen similarity edges remain unchanged; grouped design distributions include all observations.'}
    manifest['papers_sha256']=sha(DATA/'papers.json.gz')
    overlay={'package_id':manifest['package_id'],'source_manifest_sha256':manifest['source_manifest_sha256'],'devices_sha256':manifest['devices_sha256'],'design_index_sha256':manifest['design_index_sha256'],'device_count':len(devices),'rules':RULES,'aliases':aliases,'dictionary_maps':dictionary_maps,'devices':updates}
    dump(OUT/'overlay.json.gz',overlay);dump(OUT/'changes.json.gz',fixes);dump(OUT/'review.json.gz',pending)
    with (OUT/'aliases.csv').open('w',newline='') as f:
        w=csv.writer(f,lineterminator="\n");w.writerow(['property','before','after','rule','reason','observations','device_records'])
        for (prop,raw),where in sorted(seen.items()):
            r=aliases[prop][raw];w.writerow([prop,raw,r['value'],r['rule'],RULES[r['rule']],len(where),len({i for i,o in where})])
    for name in ['material_normalization.py','build_category_fixes.py']:(OUT/name).write_bytes((SITE/'scripts'/name).read_bytes())
    (OUT/'README.txt').write_text('SQbits material/substrate naming fix package v1\n\nmanifest.json: immutable source hashes, rules, counts, payload checksums.\noverlay.json.gz: browser-applied metadata and dictionary overlay.\nchanges.json.gz: every changed observation, device ID, before/after, rule, reason and source evidence.\nreview.json.gz: unresolved original descriptions, preserved without inferred fixes.\naliases.csv: complete resolved/canonical/unresolved description mapping and counts.\nPython scripts: reproducible grammar and generator (run from the sqbits scripts directory).\n\nThese are composition grouping fixes, not a validation of material attribution or superconductivity.\nFilm preparation, orientation, component role and resistivity remain in original reported wording.\nGrAl, alpha/beta Ta, compounds, stoichiometries and layer order stay distinguishable.\nAl2O3 alone is not silently relabelled sapphire. Missing entries stay missing.\nAll baseline extraction, details, indices and similarity edges are untouched.\n')
    manifest['payload_sha256']={p.name:sha(p) for p in sorted(OUT.iterdir()) if p.name not in ['manifest.json','package.zip']}
    dump(OUT/'manifest.json',manifest)
    with zipfile.ZipFile(OUT/'package.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
        for p in sorted(OUT.iterdir()):
            if p.name!='package.zip':
                info=zipfile.ZipInfo('material-substrate-v1/'+p.name,date_time=(2026,10,22,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,p.read_bytes())
    print(json.dumps(manifest['summary'],indent=2))
if __name__=='__main__':build()
