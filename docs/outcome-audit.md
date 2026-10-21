# Source PDF audit and correction layer

The 2026-10-21 audit targets the yearly upper tails of all 22 outcomes, preserving the frozen NANOSCOPE extraction. Selection takes distinct extracted device records per outcome/year: the larger of five records or 5%, or all records in smaller groups. Ranking uses each record's maximum observation. The union covers all contexts and the default own-work, measured, individual-qubit view. It also selects minimum observations for minimizing outcomes (errors, durations, TLS loss and linewidth). Other configurations of the selected device/outcome pairs are checked as supplemental observations.

This does not deduplicate physical devices across papers. The selected records are a tail sample, not an independently validated random sample or a completeness check of extraction recall.

## Inputs and retained artifacts

`public/data/outcome-audit.json.gz` is a separate overlay, with source manifest/PDF/recordset hashes, original scalar values, JSON pointers, model audit findings, short source quotations, original PDF page numbers and any explicitly reviewed overrides. `outcome-audit-report.json` summarizes coverage; `outcome-audit-coverage.json` lists every sampled outcome/year group and its population and selected count. Original outcome files, device data and evidence shards remain unchanged. The application applies corrections to copies in memory; it never overwrites raw observations.

The local scientific audit inventory additionally retains the selection rule for each claim, raw source-path mapping, source hashes, bounded cost ledger and source-page maps. PDF inputs use native inline file data. Long/large documents and independent reference checks can use source-page excerpts; `page_map` records original page numbers. Original PDFs are never modified.

Requests explicitly set `store:false`, use no conversations or previous-response references, and create no uploaded API files. Saved artifacts contain scientific findings and token/cost totals, not model sessions, provider response IDs, raw responses or reasoning traces. An API key is not included in website assets.

## Actions

- **Confirm:** supports the recorded value, association and category. Large values remain when the source supports them.
- **Correct:** source-backed numeric/unit or origin/attribution/nature correction. The original remains inspectable. If a scalar changes, old unverified uncertainty values are not carried over.
- **Exclude:** a different entity, outcome or protocol was assigned to this metric. These remain available using the audit filter. An explicitly reviewed `target_metric` creates a traceable reclassification without inventing a complementary probability or another measurement.
- **Unresolved:** source evidence is insufficient, internally inconsistent, or independent audits disagree. Retain the original claim but hide it by default and exclude it from the frontier and outcome color summaries.

Short quoted evidence is checked against PDF page text. This catches page/quotation problems but cannot itself establish scientific correctness. Image-only or inconsistent evidence needs explicit review. Sol 6.1 independently checks a selected sample of the largest values and smallest errors/durations. Substantive proposed scalar corrections additionally receive an independent Luna source pass, excluding values already checked directly or by Sol; no first-pass correction is shown to the second auditor; disagreements are flagged unless resolved against the source. A `direct_source_checked` override means Codex directly inspected the original page text or rendered page during this task. These are model/agent audits, not independent human peer review.

`frontier_eligible:false` can retain a supported specialized measurement as a hollow point while excluding it from the standard frontier. For example, an inverse partial nonsequential relaxation-channel rate is not the total computational-state lifetime. Bounds remain bounds. Protocols, encodings, postselection and statistics are not silently equated by checking their units.

Device C in Hassani et al., DOI 10.1038/s41467-023-39656-2, illustrates this distinction. Original PDF Figure 8c (p. 7) reports fluxon-well decay fits of 3.6 h, 1.0 h and 18.1 min at three flux biases. Direct inspection of the rendered figure verifies all three values and their conversions. They describe long-lived metastable fluxon populations, while full phase-coherent fluxon control remains future work in that paper. The device's plasmon-qubit T1 is 17.4 µs at zero flux in Table 1 (p. 4), with a 15.8 µs fit in Figure 6a (p. 5). All three fluxon measurements are preserved but excluded from the standard computational T1 comparison and frontier. Selection cards identify the measurement and exclusion explicitly when the audit filter reveals them.

The default remains own-work measured individual-qubit records with measured observation origin. Observation-level attribution corrections also affect that filter. Best-outcome color summaries are recomputed from the same correction layer. Networks retain their original reported-design features and topology; outcome audits do not introduce outcome-based similarity links or precomputed positions.

## Reproduce in the original data workspace

The scientific inputs are required; the public website does not contain the PDFs or private raw recordsets. Set `SQBITS_SOURCE_ROOT` to the scientific workspace and `SQBITS_AUDIT_ROOT` to a fresh audit output directory for a new run. Install `scripts/audit/requirements.txt`, expose `OPENAI_API_KEY_SETUP` in the environment, and run the relevant bounded stage. These commands make paid API calls:

```sh
python scripts/audit/audit_tails.py --inventory
python scripts/audit/expand_devices.py
python scripts/audit/audit_tails.py --parallel 32 --budget 28
python scripts/audit/prepare_reference.py
python scripts/audit/audit_tails.py --reference --model gpt-6.1-sol --parallel 12 --budget 28
```

The budget is conservative USD, uses [documented token rates](https://developers.openai.com/api/docs/pricing) checked on 2026-10-21 with short-context limits, and reserves input plus maximum output before sending each request. The supplied runner resumes completed jobs. A completed scientific result is retained even when a request's provider session is not. Run sequentially if relying on one process's budget as the total cap; concurrent processes track separate reservations.

Check substantive numeric transformations before publishing:

```sh
python scripts/audit/prepare_numeric_review.py
python scripts/audit/audit_tails.py --numeric-review --parallel 24 --budget 28
```

After reviewing scientific findings and any overrides:

```sh
python scripts/publish_audit.py
python scripts/audit/check_frontier.py --queue
# If new leaders were queued, audit them and republish before deployment.
npm test
node tests/timeline-smoke.mjs
SQBITS_TIMELINE_ONLY=1 node tests/selection-smoke.mjs
node tests/timeline-performance.mjs
```

Publishing refuses incomplete claim coverage unless `--allow-incomplete` is explicitly used for local development. It checks the frozen source hashes before creating the overlay. Rebuilding baseline data from different source recordsets requires a new audit; snapshot mismatch raises an error instead of applying stale fixes.
