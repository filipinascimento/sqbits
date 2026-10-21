from audit_tails import *
inv=read(OUT/'inventory.json');targets={t['key']:t for t in inv['targets']};chosen={};ds=read(SITE/'devices.json.gz')['nodes'];ms=read(SITE/'summary.json')['metrics']
for m in ms:
 rows=[p for p in read(SITE/f"outcomes/{m['id']}.json.gz") if ds[p['device']]['attribution']=='own_work' and ds[p['device']]['realization']=='measured_device' and ds[p['device']]['scope']=='individual_qubit' and p['origin']=='measured']
 for reverse,n in [(True,12 if m['id']=='t1' else 2)]+([(False,2)] if m['direction']=='min' else []):
  records=set()
  for p in sorted(rows,key=lambda p:p['value'],reverse=reverse):
   if p['device'] in records:continue
   records.add(p['device']);key=m['id']+':'+p['id'];chosen[key]=targets[key]
   if len(records)>=n:break
jobs=[]
for wk in sorted(set(t['work_key'] for t in chosen.values())):
 original=next(j for j in inv['jobs'] if j['work_key']==wk);jobs.append({**original,'id':wk+'_ref','force_excerpt':True,'targets':[t for t in chosen.values() if t['work_key']==wk]})
write(OUT/'inventory-reference.json',dict(targets=list(chosen.values()),jobs=jobs));print('reference',len(chosen),len(jobs))
