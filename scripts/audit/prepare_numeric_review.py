"""An independent source pass over substantive proposed scalar corrections."""
from audit_tails import *
inv=read(OUT/'inventory.json');targets={t['key']:t for t in inv['targets']};manual=read(OUT/'reviewed_overrides.json');refs={x['key'] for path in (OUT/'reference').glob('*.json') for x in read(path)['findings']};chosen={}
for path in (OUT/'findings').glob('*.json'):
 for f in read(path)['findings']:
  key=f['key'];t=targets[key]
  if key not in manual and key not in refs and f['action']=='correct' and f.get('value') is not None and not math.isclose(f['value'],t['point']['value'],rel_tol=1e-8,abs_tol=1e-12):chosen[key]=t
previous=read(OUT/'inventory-numeric.json') if (OUT/'inventory-numeric.json').exists() else {'jobs':[]}
jobs=previous['jobs'];planned={t['key'] for j in jobs for t in j['targets']};fresh={k:t for k,t in chosen.items() if k not in planned}
for wk in sorted(set(t['work_key'] for t in fresh.values())):
 original=next(j for j in inv['jobs'] if j['work_key']==wk);items=[t for t in fresh.values() if t['work_key']==wk]
 for offset in range(0,len(items),15):
  chunk=items[offset:offset+15];suffix=hashlib.sha256('|'.join(sorted(t['key'] for t in chunk)).encode()).hexdigest()[:10];jobs.append({**original,'id':wk+'_numeric_'+suffix,'force_excerpt':True,'targets':chunk})
write(OUT/'inventory-numeric.json',dict(targets=list(chosen.values()),jobs=jobs));print('numeric review',len(chosen),'claims',len(jobs),'jobs',flush=True)
