#!/usr/bin/env python3
"""Supplement immutable extraction with unit-specific numeric facets and coverage."""
import collections, gzip, hashlib, json, math
from pathlib import Path
from build_design_index import reported
SITE=Path(__file__).resolve().parents[1]/'public/data'
ROOT=SITE.parents[2]
def read(path):return json.loads(gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_text())
def build():
 catalog=read(SITE/'design-catalog.json');devices=read(SITE/'devices.json.gz')['nodes'];papers=read(SITE/'papers.json.gz')['nodes']
 manifest=read(ROOT/'pipeline_refresh/reports/device_extraction/nanoscope_full_luna_20261016_run1/extraction_manifest.json')
 fields=[];field_lookup={};records={};counts=collections.Counter();paper_sets=collections.defaultdict(set);shas={}
 for path in sorted((SITE/'details').glob('*.json.gz')):
  shas[path.name]=hashlib.sha256(path.read_bytes()).hexdigest()
  for uid,detail in read(path).items():
   r=detail['record'];steps=[s for recipe in detail['fabrication_processes'] for s in recipe['steps']];parameters=[o for s in steps for o in s['parameters']]
   work=uid.split('_p')[0];counts['records']+=1
   conditions=[o for o in parameters if reported(o.get('reported_text')) and o['property_name'] not in {'process_equipment','process_other'}]
   for key,yes in [('withSteps',bool(steps)),('withProcessParameters',bool(parameters)),('withProcessConditions',bool(conditions)),('withFabricationChoices',bool(steps) or any(catalog['properties'].get(o['property_name'],{}).get('family')=='fabrication' for o in r['design_choices']))]:
    if yes:counts[key]+=1;paper_sets[key].add(work)
   counts['linkedStepOccurrences']+=len(steps);counts['linkedParameterOccurrences']+=len(parameters)
   values=set()
   for o in r['design_choices']+parameters:
    n=o.get('normalized') or {};q=o.get('quantity') or {};value=n.get('value');unit=n.get('unit');prop=o['property_name']
    if not q:continue
    if q.get('nature') not in {'exact','approximate','with_uncertainty'}:counts['numericNonPointOmitted']+=1;continue
    if n.get('status')!='converted' or value is None or not isinstance(value,(int,float)) or not math.isfinite(value) or not unit:counts['numericUnconvertedOmitted']+=1;continue
    meta=catalog['properties'].get(prop,{'family':'design','label':prop.replace('_',' ')})
    key=(prop,unit)
    if key not in field_lookup:
     field_lookup[key]=len(fields);fields.append({'id':'numeric:'+prop+':'+unit,'property':prop,'unit':unit,'label':meta['label'],'family':meta['family'],'kind':'numeric'})
    values.add((field_lookup[key],value))
   records[uid]=sorted(values)
 flagged=[p for p in manifest if any(s['review_flags'] for s in p['segments'])];segments=[s for p in flagged for s in p['segments'] if s['review_flags']]
 issues=collections.Counter(f['issue'] for s in segments for f in s['review_flags'])
 review={'papers':len(flagged),'recordsInFlaggedSegments':sum(bool(d['review']) for d in devices),'flaggedSegments':len(segments),'flags':sum(issues.values()),'issues':dict(issues),'flaggedPaperPages':sum(p['pages'] for p in flagged),'flaggedSegmentPages':sum(s['end_page']-s['start_page']+1 for s in segments),'allSegmentsOfFlaggedPapers':sum(len(p['segments']) for p in flagged)}
 result={'version':1,'source_manifest_sha256':read(SITE/'summary.json')['provenance']['sourceManifestSha256'],'detail_shards_sha256':shas,'fields':fields,'records':[records[d['id']] for d in devices],'record_ids_sha256':hashlib.sha256('\n'.join(d['id'] for d in devices).encode()).hexdigest()}
 (SITE/'design-numeric.json.gz').write_bytes(gzip.compress(json.dumps(result,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode(),mtime=0))
 report={'source_manifest_sha256':result['source_manifest_sha256'],'population':{'papers':len(papers),'records':len(devices)},'review':review,'fabrication':{**dict(counts),'papers':{k:len(v) for k,v in paper_sets.items()}},'definitions':{'withSteps':'Device/component records with at least one explicitly linked fabrication step. Shared recipes count for each applicable record.','withProcessParameters':'Records with at least one structured process parameter, including equipment and other process details.','withProcessConditions':'Records with a reported structured process parameter other than equipment or process_other (time, temperature, pressure, chemistry, rate, angle, etc.). Narrative-only conditions are not inferred.','numeric':'Converted finite point quantities only, retaining canonical units; bounds, ranges and reported-only quantities are omitted. A record can have several distinct values.','review':'Flags are per PDF segment, inherited by its device records; flag counts are not independent device errors.'}}
 (SITE/'coverage-report.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2))
if __name__=='__main__':build()
