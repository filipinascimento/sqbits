# SQbits

An interactive atlas of superconducting-qubit papers, device designs and reported outcomes.

**Website:** https://filipinascimento.github.io/sqbits/

- **Citation atlas:** directed paper citations, Leiden communities with automatic labels, search, date/review filters, 2D/3D navigation and source inspection.
- **Device designs:** approximate nearest design neighbors, weighted communities, realization and entity-scope filters, material/substrate/geometry filters and outcome coloring.
- **Performance:** one outcome versus paper year, a filter-dependent max/min frontier, click and lasso selection, zoom, source inspection and CSV export. The default is **own-work, measured individual qubits and measured observations**.
- **Design trends:** categorical and unit-specific numeric histograms, non-stacked shares/counts over time and reporting coverage across nine design families. Filter the population, count records or distinct papers, choose the denominator and inspect supporting devices.
- **Design guide:** an interactive conceptual transmon schematic, fabrication guidance and methodological definitions.

## Run locally

Node 18+ is required. All derived website data are included; no API key is needed.

```sh
npm ci
npm run dev
```

The local path is `/sqbits/`. Build the static site with `npm run build`; `dist/` can be served on GitHub Pages. The application uses Helios Web 0.10.9 and Helios Network 0.10.4. The Helios source entry is bundled so layout workers resolve beneath the Pages base path.

```sh
npm test
node tests/browser-smoke.mjs
node tests/timeline-smoke.mjs
node tests/fidelity-scale-smoke.mjs
node tests/audit-smoke.mjs
node tests/selection-smoke.mjs
node tests/design-trends-smoke.mjs
node tests/chart-colors-smoke.mjs
node tests/colorbar-smoke.mjs
node tests/year-range-smoke.mjs
node tests/native-filter-smoke.mjs
node tests/interface-layout-smoke.mjs
SQBITS_TEST_HOVER_ONLY=1 node tests/network-controls-smoke.mjs
python scripts/test_design_index.py
```

The browser check uses Playwright. It accepts `SQBITS_TEST_URL` and uses an installed Chromium or the normal Playwright browser. It checks native force-layout motion, repeated 2D/3D transitions, pause/resume and dimension preservation after filtering, network rendering, the measured/own-work defaults, evidence inspection, lasso selection, CSV download, metric switching, filtering, the schematic and a mobile viewport. `SQBITS_TEST_LIFECYCLE=1 node tests/browser-smoke.mjs` runs the focused cooling, resume, queued-switch and teardown checks. `verification/` is local-only.

Selections appear in a docked side panel, grouped by paper with the selected device records and observation values. Shift-click adds entries; lasso selection updates the same list. Paper and device cards open source details inside the panel, with a back button that preserves the selection. Long selections load more cards on demand, and CSV export includes the complete selection.

A single selected device automatically opens its complete design section in the card. Multiple selections expose the same section in each card on demand, so a large lasso does not fetch every source shard. All reported design observations are grouped into the domain families, including `other_design_choice`, with the full reported text, quantities, origin, component, conditions, configurations and source evidence. Explicitly linked fabrication recipes retain every step and parameter. Search applies to the complete loaded record. All design observations expand directly into structured reported values, units, conditions and source evidence; there is no record-JSON download button. The full inspector puts designs before outcomes.

All four data views use Helios Web's `TwoHandleRange` for publication years. Drag either endpoint to resize, or the selected band or middle grip to pan the whole interval without changing its width. The grip also works for overlapping handles and single-year selections. Values snap to whole years within the snapshot's observed bounds. Arrow keys move a focused endpoint; on the middle band, arrows move the interval, Shift+arrow moves five years, and Home/End pans to a boundary. “All years” clears the year restriction. The slider previews immediately, with expensive filtering committed once after release (100 ms coalescing for rapid changes). Navigation cancels pending updates and active drags. The leaf control is imported separately so performance and design-trends views do not load the Helios renderer or WASM. `SQBITS_NETWORK_YEARS=1 node tests/year-range-smoke.mjs` additionally checks year filtering in both real Helios graphs.

Hovering a network node uses Helios's transient shader overlay to emphasize the node and its incident edges with the same styles used by community highlights, while applying the native other-elements style to the background. Mouseout clears the overlay without changing the evidence selection. This works in both network views and dimensions; node hover does not write persistent highlight bits or rebuild the graph.

## Data and interpretation

The snapshot includes 11,746 extracted papers and 43,523 device/component records. Counts of records are **not counts of globally unique physical devices**. Families, processors, resonators, couplers and test structures are retained with explicit entity scope. Repeated configurations stay attached to their original device. Separate records across papers or PDF segments are not silently deduplicated.

The extraction uses the frozen NANOSCOPE `sq-inventory-0.9` domain and GPT-6 Luna. Original scientific files are read-only inputs. Source excerpts, quantities, conditions, uncertainty definitions, shared fabrication recipes and review flags are preserved in lazily loaded gzip shards. PDFs, API credentials, model sessions and raw provider responses are not distributed.

The data are first-pass automated extractions, with 1,774 review-flagged papers. Schema validation does not establish complete or correct scientific attribution. Inspect source evidence before drawing conclusions about device performance.

### Citation graph

Citation links come from the existing Dimensions 2025-11-24 quantum-computing induced graph. All manifestations in the frozen canonical-work index map to the same paper. Self-links and repeated canonical links are removed. Direction is **citing → cited**. The graph has 135,513 links; 9,398 extracted papers have at least one indexed connection. Unlinked papers remain in the dataset and can be shown with the sidebar control. Absence of a link is not evidence of zero real-world citations.

Paper communities use unweighted Leiden modularity on the undirected citation projection. Community labels use distinctive source-title terms and are heuristic, not expert taxonomy. Both networks start with Helios Web’s native GPU force layout running, using WebGPU or WebGL2. Helios initializes and computes every displayed position; the dataset contains no precomputed coordinates. Pause/resume retains the same engine and positions. Dimension changes pause forces during the native position handoff, then restore the previous run state. The dimension and pause setting survive filtering. Temperature decay is 0.006, giving about 1,148 force steps per full cooling cycle. This gives the graph about 3.4 times the settling steps of the previous 0.02 setting (342 steps), while remaining faster than Helios’s 0.003 default (about 2,300 steps); elapsed time depends on the graph and GPU. The native layout cools automatically; use Resume layout to reheat it.

Both networks expose edge-width, edge-opacity, node-size and gravity sliders, retaining separate settings through filters and view changes. Width, opacity and size use Helios's native scale controls. Edge opacity starts at a 0.20 scale (down from Helios's 0.50 default), with a 0–100% slider above the network; endpoint color gradients remain native. The gravity slider spans the GPU layout's logarithmic `kGravity` range, displayed relative to its default 0.001. Changing gravity reheats an active or naturally cooled layout and respects a manual pause. Width-aware edges use Helios's default node-to-edge mapper with gradients between source and destination colors. Forced/adaptive thin-line rendering is disabled so edge widths remain adjustable. Hovering a community label uses the same source-managed `HIGHLIGHTED` mechanism as native Helios legend hover, including connected edges and dimming other items; it preserves selection and clears on pointer leave, hidden labels or graph disposal. Run `node tests/network-controls-smoke.mjs` to check these interactions in the actual renderer.

Wheel gestures over SVG community labels are forwarded to the Helios canvas with their original coordinates, deltas and modifier keys. This preserves native cursor-centered zoom in 2D, dolly zoom in 3D and picking gesture handling while retaining label hover. `SQBITS_TEST_LABEL_WHEEL_ONLY=1 node tests/network-controls-smoke.mjs` checks real wheel gestures over labels in both dimensions and networks.

Numeric colors have a continuous colorbar with ticks in the attribute's original display units. Auto uses a logarithmic scale for coherence, durations, frequencies, Q factors and errors/losses; years stay linear, counts use log(1 + count), and fidelities use the fractional gap to perfection, log(1 − F), with higher fidelity at the bright end. Color scale controls allow linear or logarithmic overrides. Exact ideal values (100% fidelity or zero error) have separately labelled endpoint colors rather than an invented finite log coordinate; missing values remain grey. The colorbar, scatterplot colors and native Helios mapper share one scale definition. Network filtering retains the full-data color domain and layout engine. `node tests/colorbar-smoke.mjs` checks the real node-color buffers against the legend, scale changes, filtering and mobile rendering.

All network filters use `FilterBehavior.replaceRules` with native typed attributes and `scope: render`, including year, search, review, communities, device classifications and isolates. Each view mounts the complete graph once. Filter updates retain the same network, layout engine, camera, positions, color domains and selection; Helios owns the active node/edge selectors and picking. Reset and empty results use the same mechanism. Filter changes during initial loading are applied after that engine initializes.

Community label representatives maximize **within-community degree centrality** on the complete graph (unweighted incident citation edges; similarity-weighted device edges). Global degree no longer promotes bridge nodes solely for external links. Rankings are computed once, with stable ID tie-breaking. A filtered view anchors each label to its highest-ranked visible member; it does not rerun community detection or centrality on a new subgraph.

The header merges the small brand with the view tabs. Filters, center content and selected evidence have independent scrolling; network and timeline canvases fill their center pane. Dataset statistics are a footer disclosure. The timeline resizes its canvas, axes and spatial index together, preserving selections and zoom.

### Device-design graph

Features derive only from explicitly reported design choices: qubit class, geometry, selected categorical design terms and positive normalized design values grouped into one-third-decade bins. Numeric component details and original terminology remain available in the inspector. Missing attributes never become negative or default design evidence.

Links use IDF-weighted Jaccard overlap. Candidate retrieval samples at most 64 records per feature using deterministic seeds, then retains each record's top six neighbors above 0.22 similarity, requiring at least two shared features. The result is symmetrized. This is an **approximate design-neighbor graph**, not exhaustive kNN, a citation relation, or fabrication lineage. Outcomes do not enter similarity. Sparse records may have no similarity links.

Device communities use weighted Leiden modularity. Labels are automatic distinctive reported terms. Edge inspection exposes shared fingerprint features. JSON edges preserve similarity weights, and weighted XNet exports are in `Results/`.

### Outcome timeline

- The year axis follows the filtered observations, with small point margins; zoom and pan stay within that extent.
- One property is shown at a time; Ramsey, echo and other T₂ remain distinct.
- Only supported, explicitly normalized, finite non-negative scalar values are plotted. Original expressions and units remain inspectable. Ordinary log axes omit zeros; the linear axis retains them.
- Single-qubit, two-qubit and readout fidelities use a logarithmic remaining gap, `1 − F`, where `F = value / 100` for percentage data. Higher fidelity stays at the top; ticks, tooltips, selections and CSV values retain fidelity in the original display units. Equal decade spacing shows tenfold reductions in infidelity. Error and loss outcomes (ideal zero) and unbounded dimensionless Q factors retain ordinary log axes. These semantics are explicit, not inferred from a dimensionless unit or a value near one.
- Reported ideal-limit fidelities have zero gap. They are counted in the log-view omission note and remain available in linear mode; no epsilon or finite error is invented. A frontier reaching an omitted ideal record terminates there, rather than extending an older, worse record through later years. Other out-of-range fidelities are disclosed and omitted from the log-gap view. The transformation is display-only: extraction and audit payloads are unchanged.
- Ranges without a reported scalar are not assigned a midpoint. Bounds and unknown forms have dashed outlines and cannot establish a frontier.
- Review-flagged observations remain visible as hollow points and cannot establish a frontier.
- The default excludes cited, simulated, analytical and design-target observations. Changing realization filters can reveal other origins; these remain excluded from the frontier.
- Frontier eligibility additionally requires a measured observation with an exact, approximate or uncertainty-bearing point value. The frontier is the cumulative best per year over the current filters: lower for errors/durations, higher for lifetimes/fidelities. Frequencies are labelled an upper envelope, not a performance ranking.
- Protocols, statistics, temperatures, bias and configurations may differ. This is an observed frontier of the extraction, not a certified world-record database.

The displayed year comes from the frozen paper manifest; it is not independently resolved for a cited device or its first demonstration. Use original sources for historical priority claims.

### Design distributions and trends

The supplementary design index covers all 43,523 records and **235,479 original design-choice observations**. Fabrication counts are linked step occurrences per record, not unique recipes or fabrication runs. The original observation and detail payloads remain unchanged. `design-catalog.json` preserves the frozen domain's property families; unknown future properties stay visible under Other design choices in the inspector.

The default population is own-work measured individual qubits. Each record contributes once to a category, regardless of repeated observations or configurations. The paper counting option unions categories across that paper's matching records. Categories may overlap, so lines are not stacked and shares may sum above 100%. The denominator selector distinguishes all filtered entries from entries reporting the field. Missing reporting is not evidence of absence; explicit negative descriptions remain reported categories. Annual zero-denominator periods are gaps. Undated entries stay in overall breakdowns and are disclosed separately from the time plots. Time bins end at the latest observed year, including partial final periods.

Type and geometry use the frozen standardized metadata. Material/substrate groups match explicit names in their named fields; compound matching precedes element matching, and qualified/comparative descriptions are kept separate. Reported materials can include electrodes, barriers, and housings: grouping a material name does not identify its role or establish that every component is superconducting. Full reported wording and component context are retained in the original records. Other categorical properties preserve reported wording with whitespace collapsed, rather than silently merging scientific descriptions. Process operations come only from recipes explicitly linked to the device.

The sidebar search finds categorical and numeric properties, families and reported categories. Choosing a property immediately reveals its distribution beside the selector. Categorical bars sit closest to the selector, with yearly lines to their right; numeric choices open a histogram in the same area. Up to 12 categorical series can be plotted together; category and time-point clicks show all supporting records in the evidence panel. Series use a dark qualitative palette with distinct colors among the current selections. Matching line patterns in the plot and legend provide an additional visual distinction. Per-field assignments keep retained series stable through year/population filters, counting modes and selection changes; newly selected categories receive unused colors. List swatches, bars, points and legend samples share the same mapping. CSV exports include counts, denominators, reporting/missing coverage, counting unit and population filters. Family coverage counts an entry reporting at least one design observation in the family, including numeric parameters and standardized qubit/geometry metadata.

Design guide has a searchable list of properties grouped by part, with one selected distribution immediately beside it. Schematic/topic selections update that same plot. The separate grid of distribution cards has been removed. Properties retain reported categorical wording or use separate numeric fields per canonical unit. Numeric histograms accept only finite converted exact/approximate/uncertainty-bearing scalar values. Ranges, bounds and unconverted quantities remain inspectable in the device record; no midpoint or shared unknown unit is invented. Numeric coverage describes indexed converted point values, rather than asserting that other entries did not report the property. Distinct values from a record remain distinct, but a record (or paper in paper-counting mode) counts at most once per bin. Wide positive spans use logarithmic bins. Clicking a bar opens supporting device records in the side panel. Guide distributions use the default measured-own-work individual-qubit population; trends apply all its population and year filters.

`design-numeric.json.gz` is a supplementary index with immutable shard hashes and record-order provenance. `coverage-report.json` distinguishes 9,623 records with linked fabrication steps (2,709 papers), 7,506 with structured process parameters, and 7,415 with specific process conditions (1,837 papers); equipment-only or unspecified process details do not establish a condition. Shared recipes count for every applicable record. Review flags cover 1,774 papers / 1,792 segments / 8,256 records; 8,206 of 8,829 flags concern configuration coverage, not confirmed measurement errors.

`review-estimate.json` and `scripts/estimate_review.py` document a prospective Sol 6.1 review without making API calls. Full PDFs of the flagged papers span 35,808 pages / 1,930 segments, including unflagged segments of those papers for context. The planning scenario estimates 122M input and 5.8M output/reasoning tokens: approximately $228 Batch / $455 Standard including 25% contingency, at the official 2026-10-21 rates. Scenarios range $195–265 Batch / $390–530 Standard; planning budgets are $200–300 / $400–600. Batch ETA is 24–48h (repairs may extend to 72h); Standard is an assumed 2–6h at 50 concurrent requests with adequate rate limits. These scenarios emit targeted correction proposals, not complete re-extractions, and are not measured full-review throughput. Existing PDF token counts, approximate tokenization of compact extraction text and conservative 30-minute cache-write input rates are explicit in the report. No review was launched.

Build the supplementary numeric index and coverage from immutable shards:

```sh
python scripts/build_design_distributions.py
```

The resource estimate additionally requires the local frozen extraction manifest, read-only SQLite receipts and recordsets:

```sh
python scripts/estimate_review.py
```

Rebuild the index from the website's published source shards without model calls or private inputs:

```sh
python scripts/build_design_index.py
```

The index records source-manifest, baseline-device and detail-shard hashes. Rebuilding the underlying extraction requires rebuilding the index too; a source/record mismatch is rejected by the application. These distributions summarize automated extraction coverage and reported choices, not independently validated industry adoption rates.

## Rebuild derived data

In the original data workspace, the builder reads the extraction manifest, immutable per-segment recordsets, canonical PDF/work mapping and existing citation-edge table:

```sh
python -m pip install -r scripts/requirements-data.txt
OPENBLAS_NUM_THREADS=2 python scripts/build_data.py --source-root /path/to/superconducting_qubits
```

The builder does not make model calls or edit extraction results. `public/data/summary.json` records provenance and the source-manifest hash. `Results/` contains native graph exports and the build report. Tests roundtrip graph identifiers, endpoints, direction and weights against the website payloads.

## Deployment

Source is in `main`; the production build is on `gh-pages`, configured as the GitHub Pages source. `scripts/deploy.sh` builds and pushes the generated static branch. It never pushes changes to `main`; commit and push source changes separately. No server credentials or OpenAI key are required by the website.

## Credits

Networks are rendered with [Helios](https://heliosweb.io/). Interface references include the SciSciForge evidence atlas and the archived superconducting-qubit metrics visualizations. The scientific diagram is a conceptual planar transmon, not an engineering drawing or a representation of every qubit family. Background: [Krantz et al., *A quantum engineer's guide to superconducting qubits*](https://doi.org/10.1063/1.5089550).

### Source audits and plot rendering

The scatterplot uses a Canvas point layer with cached colors/projections and a quadtree for picking. Axes, SOTA paths and lasso remain SVG; zoom events are coalesced with `requestAnimationFrame`. `node tests/timeline-performance.mjs` measures real wheel interaction and frame times; `SQBITS_TIMELINE_ONLY=1 node tests/selection-smoke.mjs` checks mouse picking, Shift selection, lasso, evidence and export without loading network layouts.

A separate source-PDF audit layer corrects the yearly outcome tails while preserving every original extraction value. Excluded and unresolved claims can be revealed with the Performance filter; source-backed reclassifications appear under the correct outcome. Selection cards show the measurement name, component and audit status, with explicit warnings for excluded or unresolved claims and expandable source evidence. The inspector and CSV preserve audit reasons and original values. See [audit methods and reproduction](docs/outcome-audit.md).

The 2026-10-21 source audit covers **11,834 observations across 2,745 papers and all 22 plotted outcomes**. It records 1,300 corrections (including origin, attribution and reported-form changes), 1,127 exclusions and 1,507 unresolved claims. The latter remain available with the audit filter and do not establish frontiers. The audit includes 67 extreme observations independently checked by Sol 6.1 in 50 papers and 236 substantive scalar-correction candidates given an independent Luna source check. Original reported approximations are retained when a proposal would only substitute a more precise value. Raw extraction and baseline website payloads remain intact.

Material/substrate naming is normalized by a separate, reproducible [fix package](docs/category-normalization.md). Every applied naming change retains the original observation, source evidence and reason. Grouped composition fields and original-wording fields are both available; baseline extraction files and similarity edges are unchanged.
