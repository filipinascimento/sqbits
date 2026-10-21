#!/usr/bin/env python3
"""Build categorical facets from published immutable records and explicit recipe links."""
import collections,gzip,hashlib,json,re
from pathlib import Path

SITE=Path(__file__).resolve().parents[1]/'public/data'
MISSING={'','unknown','not reported','not specified','unspecified','not stated','n/a'}
def text(value):return re.sub(r'\s+',' ',str(value or '')).strip()
def reported(value):return text(value).strip(' .').casefold() not in MISSING
def material_tags(value):
 # Match compound names first so NbTiN is never counted as Nb plus TiN.
 remaining=text(value);tags=[]
 if not reported(value):return []
 if re.search(r'\b(?:not|without|instead of|rather than|versus|compared to|compared with)\b',remaining,re.I):return ['Other / qualified composition']
 if re.fullmatch(r'lead(?: (?:film|electrodes?|junctions?))?',remaining,re.I):remaining='Pb'
 for label,pattern in [
  ('Al oxide',r'AlOx|Al2O3|alumin(?:um|ium)[ -]oxide'),('Nb oxide',r'NbOx|Nb2O5|niobium[ -]oxide'),('Ta oxide',r'TaOx|Ta2O5|tantalum[ -]oxide'),
  ('NbTiN',r'NbTiN|niobium[ -]titanium[ -]nitride'),('NbN',r'NbN|niobium[ -]nitride'),
  ('TiN',r'TiN|titanium[ -]nitride'),('MoRe',r'MoRe|molybdenum[ -]rhenium'),
  ('Al',r'Al|alumin(?:um|ium)'),('Nb',r'Nb|niobium'),('Ta',r'Ta|tantalum'),
  ('Pb',r'Pb'),('Re',r'Re|rhenium'),('V',r'vanadium'),('Cu',r'Cu|copper'),('Au',r'Au|gold'),('Pt',r'Pt|platinum'),('Pd',r'Pd|palladium')]:
  rx=re.compile(r'(?<![a-z0-9])(?:'+pattern+r')(?![a-z0-9])',re.I)
  if rx.search(remaining):tags.append(label);remaining=rx.sub(' ',remaining)
 return tags or (['Other reported composition'] if reported(value) else [])
def substrate_tags(value):
 remaining=text(value);tags=[]
 if not reported(value):return []
 if re.search(r'\b(?:not|without|instead of|rather than|versus|compared to|compared with)\b',remaining,re.I):return ['Other / qualified substrate']
 for label,pattern in [
  ('Silicon on insulator',r'SOI|silicon[ -]on[ -]insulator'),('Silicon nitride',r'SiN|Si3N4|silicon nitride'),
  ('Silicon dioxide / silica',r'SiO2|silica|silicon dioxide'),('Silicon carbide',r'SiC|silicon carbide'),
  ('Sapphire',r'sapphire'),('Silicon',r'Si|silicon'),('GaAs',r'GaAs|gallium arsenide'),
  ('Diamond',r'diamond'),('MgO',r'MgO|magnesium oxide'),('Germanium',r'Ge|germanium')]:
  rx=re.compile(r'(?<![a-z0-9])(?:'+pattern+r')(?![a-z0-9])',re.I)
  if rx.search(remaining):tags.append(label);remaining=rx.sub(' ',remaining)
 return tags or (['Other reported substrate'] if reported(value) else [])
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def read(path):return json.loads(gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_text())

def build():
 catalog=read(SITE/'design-catalog.json');properties=catalog['properties'];devices=read(SITE/'devices.json.gz')['nodes']
 fields=[{'id':'design_family','label':'Design-family reporting','family':'all','kind':'coverage'},
  {'id':'qubit_type','label':'Qubit family','family':'qubit','kind':'standardized'},
  {'id':'qubit_variant','label':'Named variant (reported wording)','family':'qubit','kind':'verbatim'},
  {'id':'material_family','label':'Reported material families','family':'materials','kind':'explicit_mentions'},
  {'id':'substrate_family','label':'Substrate families','family':'interfaces','kind':'explicit_mentions'},
  {'id':'geometry','label':'Planar / cavity geometry','family':'geometry','kind':'standardized'},
  {'id':'fabrication_operation','label':'Fabrication operations','family':'fabrication','kind':'linked_recipe'}]
 fields += [{'id':k,'label':v['label']+' (reported wording)','family':v['family'],'kind':'verbatim'} for k,v in properties.items() if v['dimension']=='text']
 allowed={f['id'] for f in fields};dictionary=[];lookup={};records={};shard_hashes={};observations=0;steps_total=0
 def intern(value):
  if value not in lookup:lookup[value]=len(dictionary);dictionary.append(value)
  return lookup[value]
 for path in sorted((SITE/'details').glob('*.json.gz')):
  shard_hashes[path.name]=sha(path)
  for uid,detail in read(path).items():
   r=detail['record'];values=collections.defaultdict(set);families=set();steps=[]
   def add(key,value):
    if key in allowed and reported(value):values[key].add(intern(text(value)))
   add('qubit_type',r['qubit_type']);add('qubit_variant',r.get('subtype_reported'))
   add('geometry',r['geometry'])
   if r['qubit_type'] not in ['Unknown','not_a_qubit'] or reported(r.get('subtype_reported')):families.add('qubit')
   if r['geometry']!='Unknown':families.add('geometry')
   for o in r['design_choices']:
    prop=o['property_name'];value=o['reported_text']
    if reported(value):families.add(properties.get(prop,{'family':'design'})['family'])
    add(prop,value)
    if prop=='superconductor_composition':
     for tag in material_tags(value):add('material_family',tag)
    if prop=='substrate_material':
     for tag in substrate_tags(value):add('substrate_family',tag)
   # Shards contain only recipes explicitly linked to this record by NANOSCOPE.
   for recipe in detail['fabrication_processes']:
    for step in recipe['steps']:
     steps.append(step);add('fabrication_operation',step['operation'])
     for parameter in step['parameters']:add(parameter['property_name'],parameter['reported_text'])
   if steps:families.add('fabrication')
   records[uid]={'id':uid,'designCount':len(r['design_choices']),'recipeCount':len(detail['fabrication_processes']),'stepCount':len(steps),'families':sorted(families),'values':{k:sorted(v) for k,v in values.items()}}
   observations+=len(r['design_choices']);steps_total+=len(steps)
 assert set(records)=={d['id'] for d in devices},'Every device must map to exactly one detail record'
 result={'version':1,'source_manifest_sha256':read(SITE/'summary.json')['provenance']['sourceManifestSha256'],
  'devices_sha256':sha(SITE/'devices.json.gz'),'detail_shards_sha256':shard_hashes,
  'families':catalog['families'],'fields':fields,'dictionary':dictionary,'records':[records[d['id']] for d in devices],
  'summary':{'records':len(records),'designObservations':observations,'linkedFabricationSteps':steps_total},
  'category_policy':'Type and planar/cavity geometry use frozen standardized metadata. Material/substrate families group recognized explicit names in their named design fields; compounds are matched first. Qualified/comparative descriptions and unrecognized compositions retain separate Other categories. These groups do not exhaust complex compositions: the reported-wording fields retain complete descriptions and layer context. Other categories preserve reported wording with whitespace collapsed. Fabrication operations come only from explicitly linked recipes. Multiple values per record are retained.'}
 raw=json.dumps(result,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode()
 (SITE/'design-index.json.gz').write_bytes(gzip.compress(raw,compresslevel=6,mtime=0))
 print(json.dumps({**result['summary'],'categories':len(dictionary),'compressedMB':round((SITE/'design-index.json.gz').stat().st_size/1e6,2)},indent=2))

if __name__=='__main__':build()
