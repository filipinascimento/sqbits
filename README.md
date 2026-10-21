# SQbits

An interactive atlas of superconducting-qubit papers, device designs and reported outcomes.

**Website:** https://filipinascimento.github.io/sqbits/

- **Citation atlas:** directed paper citations, Leiden communities with automatic labels, search, date/review filters, 2D/3D navigation and source inspection.
- **Device designs:** approximate nearest design neighbors, weighted communities, realization and entity-scope filters, material/substrate/geometry filters and outcome coloring.
- **Performance:** one outcome versus paper year, a filter-dependent max/min frontier, lasso and checkbox selection, zoom, source inspection and CSV export. The default is **own-work, measured individual qubits and measured observations**.
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
```

The browser check uses Playwright. It accepts `SQBITS_TEST_URL` and uses an installed Chromium or the normal Playwright browser. It checks network rendering, the measured/own-work defaults, evidence inspection, lasso selection, CSV download, metric switching, filtering, the schematic and a mobile viewport. `verification/` is local-only.

## Data and interpretation

The snapshot includes 11,746 extracted papers and 43,523 device/component records. Counts of records are **not counts of globally unique physical devices**. Families, processors, resonators, couplers and test structures are retained with explicit entity scope. Repeated configurations stay attached to their original device. Separate records across papers or PDF segments are not silently deduplicated.

The extraction uses the frozen NANOSCOPE `sq-inventory-0.9` domain and GPT-6 Luna. Original scientific files are read-only inputs. Source excerpts, quantities, conditions, uncertainty definitions, shared fabrication recipes and review flags are preserved in lazily loaded gzip shards. PDFs, API credentials, model sessions and raw provider responses are not distributed.

The data are first-pass automated extractions, with 1,774 review-flagged papers. Schema validation does not establish complete or correct scientific attribution. Inspect source evidence before drawing conclusions about device performance.

### Citation graph

Citation links come from the existing Dimensions 2025-11-24 quantum-computing induced graph. All manifestations in the frozen canonical-work index map to the same paper. Self-links and repeated canonical links are removed. Direction is **citing → cited**. The graph has 135,513 links; 9,398 extracted papers have at least one indexed connection. Unlinked papers remain in the dataset and can be shown with the sidebar control. Absence of a link is not evidence of zero real-world citations.

Paper communities use unweighted Leiden modularity on the undirected citation projection. Community labels use distinctive source-title terms and are heuristic, not expert taxonomy. Seeded layouts arrange the largest connected component and pack smaller components/isolates without letting isolates hide the connected graph.

### Device-design graph

Features derive only from explicitly reported design choices: qubit class, geometry, selected categorical design terms and positive normalized design values grouped into one-third-decade bins. Numeric component details and original terminology remain available in the inspector. Missing attributes never become negative or default design evidence.

Links use IDF-weighted Jaccard overlap. Candidate retrieval samples at most 64 records per feature using deterministic seeds, then retains each record's top six neighbors above 0.22 similarity, requiring at least two shared features. The result is symmetrized. This is an **approximate design-neighbor graph**, not exhaustive kNN, a citation relation, or fabrication lineage. Outcomes do not enter similarity. Sparse records may have no similarity links.

Device communities use weighted Leiden modularity. Labels are automatic distinctive reported terms. Edge inspection exposes shared fingerprint features. JSON edges preserve similarity weights, and weighted XNet exports are in `Results/`.

### Outcome timeline

- One property is shown at a time; Ramsey, echo and other T₂ remain distinct.
- Only supported, explicitly normalized, finite non-negative scalar values are plotted. Original expressions and units remain inspectable. Log axes omit zeros; the linear axis retains them.
- Ranges without a reported scalar are not assigned a midpoint. Bounds and unknown forms have dashed outlines and cannot establish a frontier.
- Review-flagged observations remain visible as hollow points and cannot establish a frontier.
- The default excludes cited, simulated, analytical and design-target observations. Changing realization filters can reveal other origins; these remain excluded from the frontier.
- Frontier eligibility additionally requires a measured observation with an exact, approximate or uncertainty-bearing point value. The frontier is the cumulative best per year over the current filters: lower for errors/durations, higher for lifetimes/fidelities. Frequencies are labelled an upper envelope, not a performance ranking.
- Protocols, statistics, temperatures, bias and configurations may differ. This is an observed frontier of the extraction, not a certified world-record database.

The displayed year comes from the frozen paper manifest; it is not independently resolved for a cited device or its first demonstration. Use original sources for historical priority claims.

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
