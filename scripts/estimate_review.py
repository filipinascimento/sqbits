#!/usr/bin/env python3
"""Estimate a future Sol review; reads receipts only and makes no API calls."""
import json,sqlite3,statistics
from pathlib import Path
SITE=Path(__file__).resolve().parents[1]/'public/data';ROOT=SITE.parents[2]
BASE=ROOT/'pipeline_refresh/reports/device_extraction/nanoscope_full_luna_20261016_run1'
manifest=json.loads((BASE/'extraction_manifest.json').read_text());flagged=[p for p in manifest if any(s['review_flags'] for s in p['segments'])]
db=sqlite3.connect('file:'+str(BASE/'task.sqlite3')+'?mode=ro',uri=True)
inputs={r[0]:r[1] for r in db.execute('select custom_id,input_tokens from chunks')}
segments=[s for p in flagged for s in p['segments']];characters={s['custom_id']:len(json.dumps({'records':json.loads(Path(s['recordset_path']).read_text()),'flags':s['review_flags']},ensure_ascii=False,separators=(',',':'))) for s in segments}
scenarios={}
for name,chars_per_token,output in [('lower',5,1000),('planning',4,3000),('upper',3,5000)]:
 standard=0;long=0;tin=0
 for s in segments:
  n=inputs[s['custom_id']]+characters[s['custom_id']]/chars_per_token+2000;tin+=n
  is_long=n>272000;long+=is_long
  # 30m cache-write input rate is deliberately conservative; no cached discount.
  standard+=(n*(5 if is_long else 2.5)+output*(15 if is_long else 10))/1e6
 scenarios[name]={'estimated_input_tokens':round(tin),'estimated_output_tokens':len(segments)*output,'long_context_requests':long,'standard_usd_with_25pct_contingency':round(standard*1.25,2),'batch_usd_with_25pct_contingency':round(standard*.5*1.25,2)}
audit=ROOT/'pipeline_refresh/reports/device_extraction/outcome_tail_audit_20261021_run1/usage_gpt-6.1-sol.jsonl'
u=[json.loads(l) for l in audit.read_text().splitlines()]
result={'as_of':'2026-10-21','model':'gpt-6.1-sol','no_new_inference':True,'scope':'Review full PDFs and existing extraction for every flagged paper, including all its segments; emit source-backed correction proposals rather than rewriting the raw extraction.','papers':len(flagged),'requests':len(segments),'pdf_pages':sum(p['pages'] for p in flagged),'measured_previous_input_tokens':sum(inputs[s['custom_id']] for s in segments),'compact_recordset_characters':sum(characters.values()),'scenarios':scenarios,'assumptions':{'additional_prompt_tokens_per_request':2000,'output_tokens_per_request_including_reasoning':[1000,3000,5000],'chars_per_token':[5,4,3],'contingency_fraction':.25,'standard_input_30m_cache_write_usd_per_million':2.5,'standard_output_usd_per_million':10,'long_context_threshold':272000,'long_input_30m_cache_write_usd_per_million':5,'long_output_usd_per_million':15,'batch_multiplier':.5,'no_cache_hit_savings_assumed':True},'observed_narrow_sol_audit':{'requests':len(u),'total_usd_conservative':round(sum(r['usd_conservative'] for r in u),5),'median_seconds':round(statistics.median(r['seconds'] for r in u),2),'scope':'Outcome extremes only; much narrower than reviewing whole extraction.'},'planning_eta':{'standard_hours_at_50_concurrent':[2,6],'batch_hours':[24,48],'batch_hours_with_repairs_up_to':72,'notes':'ETA is a planning assumption, not a measured full-review throughput. Depends on account token/rate limits and dependent repairs. Prior complete Sol extractions took roughly 8–11 minutes per paper; narrow audit median 13.5 seconds. Full review falls between these workloads.'},'sources':['https://developers.openai.com/api/docs/pricing','https://developers.openai.com/api/docs/guides/batch'],'limitations':['Existing input counts include the previous extraction schema, so reusing them is conservative for PDF input.','Existing extraction text uses a 3–5 character/token estimate, not a provider token count.','Output sizes are scenarios; full re-extraction would be substantially more expensive.','Cache retention, rate limits, actual output/reasoning and retries may change cost. No new review has been started.']}
(SITE/'review-estimate.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
