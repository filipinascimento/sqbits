#!/usr/bin/env python3
"""Create a validated overlay without altering source or published raw data."""
import argparse,collections,gzip,hashlib,json,math,re,sys,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(Path(__file__).resolve().parent/'audit'))
from audit_tails import read,write,sha,OUT,RAW,SITE

def norm(s):return re.sub(r'[^a-z0-9]+','',unicodedata.normalize('NFKD',s).lower().replace('μ','u').replace('µ','u'))
def source_match(quote,text):
 q=norm(quote);s=norm(text)
 if len(q)>=3 and q in s:return True
 tokens=set(re.findall(r'[a-z0-9]{2,}',unicodedata.normalize('NFKD',quote).lower()))
 return len(tokens)>=3 and sum(norm(t) in s for t in tokens)/len(tokens)>=.92

def publish(allow_incomplete=False):
 import fitz
 fitz.TOOLS.mupdf_display_errors(False);fitz.TOOLS.mupdf_display_warnings(False)
 inv=read(OUT/'inventory.json');targets={t['key']:t for t in inv['targets']};findings={};reclassifications=[];statuses=collections.Counter();source_cache={};manual=read(OUT/'reviewed_overrides.json') if (OUT/'reviewed_overrides.json').exists() else {}
 assert sha(RAW/'extraction_manifest.json')==inv['raw_manifest_sha256'],'Original source manifest changed'
 numeric_reviews={x['key']:x for p in (OUT/'numeric_review').glob('*.json') for x in read(p)['findings']}
 numeric_inventory=read(OUT/'inventory-numeric.json') if (OUT/'inventory-numeric.json').exists() else {'targets':[]}
 numeric_missing={t['key'] for t in numeric_inventory['targets']}-set(numeric_reviews)
 references={x['key']:x for p in (OUT/'reference').glob('*.json') for x in read(p)['findings']}
 results=[read(f) for f in sorted((OUT/'findings').glob('*.json'))]
 covered={x['key'] for r in results for x in r['findings']}
 for path in sorted((OUT/'reference').glob('*.json')):
  r=read(path);missing_findings=[x for x in r['findings'] if x['key'] not in covered]
  if missing_findings:results.append({**r,'findings':missing_findings})
 required_numeric={f['key'] for r in results for f in r['findings'] if f['action']=='correct' and f.get('value') is not None and not math.isclose(f['value'],targets[f['key']]['point']['value'],rel_tol=1e-8,abs_tol=1e-12) and f['key'] not in manual and f['key'] not in references}
 numeric_missing|=required_numeric-set(numeric_reviews)
 source_missing=set(targets)-{f['key'] for r in results for f in r['findings']}
 if source_missing and not allow_incomplete:raise ValueError(f'{len(source_missing)} observations have not been audited')
 if numeric_missing and not allow_incomplete:raise ValueError(f'{len(numeric_missing)} numeric transformations await independent source checks')
 for t in targets.values():assert sha(Path(t['recordset_path']))==t['recordset_sha256'],'Original extraction changed'
 for result in results:
  for finding in result['findings']:
   key=finding['key'];t=targets[key];x={**finding}
   ref=references.get(key) if result['model']=='gpt-6-luna' else None
   if ref:
    same_value=(ref.get('value') is None and x.get('value') is None) or (isinstance(ref.get('value'),(int,float)) and isinstance(x.get('value'),(int,float)) and math.isclose(ref['value'],x['value'],rel_tol=1e-8,abs_tol=1e-12))
    same=(ref['action']==x['action'] and (ref['action'] in ['exclude','unresolved'] or (same_value and all(ref.get(k)==x.get(k) for k in ['origin','attribution','nature']))))
    x['reference_review']={'model':'gpt-6.1-sol','agreement':same,'finding':ref}
    if not same:x.update(proposed_action=x['action'],action='unresolved',reason='Independent PDF audits disagree; requires review. Luna: '+x['reason']+' Sol 6.1: '+ref['reason'])
   numeric=numeric_reviews.get(key)
   if numeric and x['action']=='correct':
    agrees=numeric['action'] in ['confirm','correct'] and isinstance(numeric.get('value'),(int,float)) and math.isclose(numeric['value'],x['value'],rel_tol=1e-8,abs_tol=1e-12)
    x['numeric_review']={'model':'gpt-6-luna','agreement':agrees,'finding':numeric}
    original=t['point']['value']
    supports_original=numeric['action'] in ['confirm','correct'] and isinstance(numeric.get('value'),(int,float)) and math.isclose(numeric['value'],original,rel_tol=1e-8,abs_tol=1e-12)
    precision_only=supports_original and abs(x['value']-original)<=.1*max(abs(original),1e-12) and re.search(r'more precise|rounded|nominal',x['reason'],re.I)
    if not agrees and precision_only:
     proposal={k:x.get(k) for k in ['action','value','origin','attribution','nature','page','quote','reason']};x.update(numeric);x['numeric_review']['decision']='retain_reported_approximation';x['numeric_review']['first_proposal']=proposal;x['reason']='Retain the source-reported approximation rather than substitute a more precise or differently fitted value. '+numeric['reason']
    elif not agrees:x.update(proposed_action=x['action'],action='unresolved',reason='Independent numeric audit disagrees; requires review. First audit: '+x['reason']+' Second audit: '+numeric['reason'])
   x.update(manual.get(key,{}))
   assert key not in findings,'Duplicate audit claim'
   pdf=Path(next(j['pdf_path'] for j in inv['jobs'] if j['work_key']==t['work_key']))
   page=x.get('page');cache_key=(t['work_key'],page)
   if cache_key not in source_cache:
    assert sha(pdf)==result['pdf_sha256'],'Source PDF changed'
    with fitz.open(pdf) as doc:source_cache[cache_key]=doc[page-1].get_text() if page and 1<=page<=len(doc) else ''
   source_ok=bool(page and source_match(x['quote'],source_cache[cache_key]))
   # A model assertion with no recoverable supporting source quote never
   # silently changes a measurement or sets a record line.
   if not source_ok and not x.get('direct_source_checked'):
    x.update(proposed_action=x['action'],action='unresolved',reason='Source evidence requires review: '+x['reason'])
   for k,original in [('origin',t['point']['origin']),('nature',t['point']['nature']),('attribution',t['device']['attribution'])]:
    if x.get(k) is None:x[k]=original
   if x['action']=='confirm' and (not math.isclose(x['value'],t['point']['value'],rel_tol=1e-8,abs_tol=1e-12) or any(x[k]!=old for k,old in [('origin',t['point']['origin']),('nature',t['point']['nature']),('attribution',t['device']['attribution'])])):x['action']='correct'
   if x['action']=='correct' and (x['value'] is None or x['value']<0 or not math.isfinite(x['value'])):x.update(action='unresolved',reason='Invalid proposed correction: '+x['reason'])
   if x['action']=='correct' and ('fidelity' in t['metric'] or t['metric'] in ['single_qubit_gate_error','two_qubit_gate_error','readout_error']) and x['value']>100:x.update(action='unresolved',reason='Probability outside [0,100]%: '+x['reason'])
   if x['action']=='correct' or (x['action']=='exclude' and x.get('target_metric')):
    mid=x.get('target_metric',t['metric']);metric=next(m for m in read(SITE/'summary.json')['metrics'] if m['id']==mid);unit='s' if metric['unit'] in ['µs','ns'] else 'Hz' if metric['unit'] in ['GHz','MHz'] else '1'
    x['corrected_property_name']=mid
    x['corrected_normalized']={'value':x['value']/metric['factor'],'unit':unit,'status':'converted','note':'Source-audit overlay; original extraction and reported quantity retained. Scalar conversion only; unverified uncertainties are not revised.'}
   x.update(selection_reasons=t['reasons'],metric=t['metric'],device_id=t['device']['id'],original_value=t['point']['value'],unit=t['unit'],recordset_sha256=t['recordset_sha256'],source_pointer=t['pointer'],pdf_sha256=result['pdf_sha256'],source_quote_matched=source_ok,model=result['model'])
   findings[key]=x;statuses[x['action']]+=1
   if x.get('target_metric') and x['action']=='exclude':reclassifications.append({**x,'point':t['point']})
 missing=set(targets)-set(findings)
 if missing and not allow_incomplete:raise ValueError(f'{len(missing)} observations have not been audited')
 # Recompute color summaries from the same corrected outcomes the timeline uses.
 ds=read(SITE/'devices.json.gz')['nodes'];metrics=read(SITE/'summary.json')['metrics'];best=collections.defaultdict(dict)
 for m in metrics:
  for p in read(SITE/f"outcomes/{m['id']}.json.gz"):
   f=findings.get(m['id']+':'+p['id'],{});action=f.get('action');value=f.get('value') if action=='correct' else p['value'];origin=f.get('origin',p['origin']) if action=='correct' else p['origin'];nature=f.get('nature',p['nature']) if action=='correct' else p['nature']
   if action in ['exclude','unresolved'] or f.get('frontier_eligible') is False or origin!='measured' or nature not in ['exact','approximate','with_uncertainty']:continue
   values=best[p['device']];old=values.get(m['id'])
   if old is None or (value<old if m['direction']=='min' else value>old):values[m['id']]=value
 for f in reclassifications:
  p=f['point'];value=f['value'];mid=f['target_metric'];m=next(m for m in metrics if m['id']==mid)
  if f['origin']=='measured' and f['nature'] in ['exact','approximate','with_uncertainty']:
   old=best[p['device']].get(mid)
   if old is None or (value<old if m['direction']=='min' else value>old):best[p['device']][mid]=value
 updates={i:best.get(i,{}) for i,d in enumerate(ds) if d['best']!=best.get(i,{})}
 usage=[json.loads(l) for p in OUT.glob('usage_*.jsonl') for l in p.read_text().splitlines()]
 overlay=dict(version='2026-10-21',source_manifest_sha256=inv['raw_manifest_sha256'],selection_rule=inv['rule'],counts=dict(statuses),selected_observations=len(read(OUT/'inventory-selection.json')['targets']) if (OUT/'inventory-selection.json').exists() else len(targets),configuration_observations=inv.get('other_configuration_observations',0),frontier_closure_observations=inv.get('frontier_closure_observations',0),audited_observations=len(findings),pending=len(missing),numeric_review_claims=len(numeric_inventory['targets']),numeric_review_pending=len(numeric_missing),papers=len(set(targets[k]['work_key'] for k in findings)),usd_conservative=sum(u['usd_conservative'] for u in usage),findings=findings,reclassifications=reclassifications,device_best=updates)
 write(SITE/'outcome-audit-overrides.json',manual)
 write(SITE/'outcome-audit-coverage.json',{'rule':inv['rule'],'groups':inv['groups']})
 write(SITE/'outcome-audit-report.json',{k:v for k,v in overlay.items() if k not in ['findings','device_best','reclassifications']})
 raw=json.dumps(overlay,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode();(SITE/'outcome-audit.json.gz').write_bytes(gzip.compress(raw,mtime=0));write(OUT/'publication_report.json',{k:v for k,v in overlay.items() if k not in ['findings','device_best','reclassifications']});print(json.dumps({k:v for k,v in overlay.items() if k not in ['findings','device_best','reclassifications']},indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--allow-incomplete',action='store_true');publish(p.parse_args().allow_incomplete)
