"""Queue any newly exposed default frontier leaders after applying corrections."""
from audit_tails import *
import copy
ap=argparse.ArgumentParser();ap.add_argument('--queue',action='store_true');args=ap.parse_args()
inv=read(OUT/'inventory.json');audit=read(SITE/'outcome-audit.json.gz');ds=read(SITE/'devices.json.gz')['nodes'];ps=read(SITE/'papers.json.gz')['nodes'];manifest={p['work_key']:p for p in read(RAW/'extraction_manifest.json')};known={t['key'] for t in inv['targets']};new=[]
for metric in read(SITE/'summary.json')['metrics']:
 mid=metric['id'];annual={};annual_positive={}
 for point in read(SITE/f'outcomes/{mid}.json.gz'):
  p=copy.copy(point);key=mid+':'+p['id'];f=audit['findings'].get(key,{});d=ds[p['device']];action=f.get('action')
  if action in ['exclude','unresolved'] or f.get('frontier_eligible') is False:continue
  if action=='correct':
   for field in ['value','origin','nature']:
    if f.get(field) is not None:p[field]=f[field]
  attribution=f.get('attribution') or d['attribution']
  if not (p['eligible'] and p['origin']=='measured' and p['nature'] in ['exact','approximate','with_uncertainty'] and attribution=='own_work' and d['realization']=='measured_device' and d['scope']=='individual_qubit'):continue
  year=d['year'];old=annual.get(year)
  if year is not None and (old is None or (p['value']<old[0]['value'] if metric['direction']=='min' else p['value']>old[0]['value'])):annual[year]=(p,point,key)
  old_positive=annual_positive.get(year)
  if year is not None and p['value']>0 and (old_positive is None or (p['value']<old_positive[0]['value'] if metric['direction']=='min' else p['value']>old_positive[0]['value'])):annual_positive[year]=(p,point,key)
 for annual in [annual,annual_positive]:
  best=math.inf if metric['direction']=='min' else -math.inf
  for year,(p,point,key) in sorted(annual.items()):
   improves=p['value']<best if metric['direction']=='min' else p['value']>best
   if not improves:continue
   best=p['value']
   if key in known:continue
   d=ds[p['device']];paper=manifest[ps[d['paper']]['id']];custom,ri=d['id'].rsplit(':',1);seg=next(s for s in paper['segments'] if s['custom_id']==custom);rp=Path(seg['recordset_path']);r=read(rp)['records'][int(ri)];oi=int(p['id'].split(':')[1]);field='outcomes' if oi<len(r['outcomes']) else 'design_choices';idx=oi if field=='outcomes' else oi-len(r['outcomes'])
   known.add(key)
   new.append(dict(key=key,metric=mid,unit=metric['unit'],point=point,device={k:d[k] for k in ['id','label','sourceId','type','scope','attribution','realization','year']},work_key=paper['work_key'],recordset_path=str(rp),recordset_sha256=sha(rp),pointer=f'/records/{ri}/{field}/{idx}',observation=r[field][idx],source_page_start=seg['start_page'],reasons=['newly_exposed_corrected_default_frontier']))
print(json.dumps(dict(new_frontier_observations=len(new),papers=len(set(t['work_key'] for t in new)))),flush=True)
if args.queue and new:
 inv['targets'].extend(new);inv['frontier_closure_observations']=inv.get('frontier_closure_observations',0)+len(new)
 for wk in sorted(set(t['work_key'] for t in new)):
  paper=manifest[wk];items=[t for t in new if t['work_key']==wk];suffix=hashlib.sha256('|'.join(sorted(t['key'] for t in items)).encode()).hexdigest()[:10]
  inv['jobs'].append(dict(id=f'{wk}_frontier_{suffix}',work_key=wk,title=paper['title'],pdf_path=paper['pdf_path'],pdf_sha256=paper['pdf_sha256'],targets=items))
 write(OUT/'inventory.json',inv)
