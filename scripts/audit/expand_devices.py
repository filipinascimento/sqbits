"""Also check the other configurations of every selected device/outcome pair."""
from audit_tails import *
import copy
inv=read(OUT/'inventory.json');original=OUT/'inventory-selection.json'
if original.exists():raise SystemExit('Already expanded')
write(original,inv)
targets={t['key']:t for t in inv['targets']};by_record={}
for t in inv['targets']:by_record[(t['metric'],t['point']['device'])]=t
extra=[]
for mid in sorted(set(t['metric'] for t in inv['targets'])):
 for p in read(SITE/f'outcomes/{mid}.json.gz'):
  template=by_record.get((mid,p['device']));key=mid+':'+p['id']
  if not template or key in targets:continue
  t=copy.deepcopy(template);rs=read(Path(t['recordset_path']));ri=int(t['device']['id'].rsplit(':',1)[1]);r=rs['records'][ri];oi=int(p['id'].split(':')[1]);field='outcomes' if oi<len(r['outcomes']) else 'design_choices';idx=oi if field=='outcomes' else oi-len(r['outcomes']);t.update(key=key,point=p,observation=r[field][idx],pointer=f'/records/{ri}/{field}/{idx}',reasons=['other_configuration_of_selected_device']);targets[key]=t;extra.append(t)
manifest={p['work_key']:p for p in read(RAW/'extraction_manifest.json')}
for wk in sorted(set(t['work_key'] for t in extra)):
 paper=manifest[wk];items=[t for t in extra if t['work_key']==wk]
 for offset in range(0,len(items),15):inv['jobs'].append(dict(id=f'{wk}_extra{offset//15:02d}',work_key=wk,title=paper['title'],pdf_path=paper['pdf_path'],pdf_sha256=paper['pdf_sha256'],targets=items[offset:offset+15]))
inv['targets']=list(targets.values());inv['other_configuration_observations']=len(extra);write(OUT/'inventory.json',inv)
print('expanded',len(extra),'total targets',len(targets),'jobs',len(inv['jobs']))
