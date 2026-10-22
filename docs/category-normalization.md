# Material and substrate naming fixes

The original network metadata used the **first reported design-choice phrase**, truncated to 160 characters, as its category. Exact string equality therefore separated `Al`, `aluminum`, `aluminium` and capitalization variants. The design index already offered broader material families, but its reported-wording fields intentionally kept those strings separate.

`material-substrate-v1` adds controlled composition groups to the device filters, colors, performance filters and design distributions. Both grouped and original-wording design fields remain selectable. Inspecting a device shows its naming changes and reasons alongside the complete original observations and source quotes. A record with multiple equivalent descriptions counts once in a grouped category; observations for different components remain separate in the evidence.

## Fix package

The complete [package directory](../public/data/fixes/material-substrate-v1/) and [ZIP](../public/data/fixes/material-substrate-v1/package.zip) contain:

- `manifest.json`: extraction manifest hash, device/paper/index hashes, all 256 detail-shard hashes, rule definitions, counts and payload checksums.
- `changes.json.gz`: each changed observation, device ID/index, paper title/ID/link, property, component/configuration, original and grouped text, rule, reason, original JSON pointer, source quotes and absolute PDF page numbers.
- `aliases.csv`: all resolved, already canonical and unresolved descriptions, with observation and record counts.
- `overlay.json.gz`: the browser-applied metadata/dictionary fixes. Original values and device identities are checked before application.
- `review.json.gz`: descriptions left unchanged because the controlled grammar cannot safely resolve them. This includes generic or missing composition statements, complex multilayers, alternatives and comparisons; a review entry is not a confirmed extraction error.
- The normalizer and builder scripts, plus package instructions.

Published package: [download naming fixes and provenance](https://filipinascimento.github.io/sqbits/data/fixes/material-substrate-v1/package.zip).

## Scope and scientific distinctions

Rules must match the **whole description** after removing an explicit whitelist of composition-neutral qualifiers. Element-name spelling, symbols, capitalization, typographic subscripts and equivalent compound names can be grouped. A `Nb` substring inside `NbN` never establishes niobium metal. A preparation or orientation qualifier is removed only from the composition grouping key: its full wording remains in the observation and fix ledger, and separately extracted orientation/preparation fields are unchanged.

Granular Al, alpha/beta Ta, stoichiometries, explicit slash-separated layer order, SOI, oxidized silicon and silicon dioxide remain distinguishable. Generic aluminium oxide does not acquire a stoichiometry. `Al2O3` without explicit sapphire identification is not silently assigned sapphire crystallinity. Ambiguous alloy ratios, doping, comparisons, alternatives, unrecognized chemical descriptions and missing entries are not inferred. The normalized reported-superconductor field preserves the extraction's attribution: it does not independently establish that every reported material is superconducting.

The first-choice network metadata semantics remain unchanged. Complete design distributions include every design-choice observation, including later materials/components. Similarity edges, communities and raw fingerprints remain frozen; this package changes the composition category labels, not graph topology.

## Coverage

This version records **6,600 naming changes**: 2,840 material observations and 3,760 substrate observations. First-choice metadata changes affect 2,492 material entries and 3,660 substrate entries (populations overlap). Examples after grouping: 1,870 metadata entries in `Al`, 2,024 in `Silicon`, and 1,276 in `Sapphire`.

The review ledger contains 3,615 material observations and 1,434 substrate observations. The original metadata's 36,013 missing materials and 38,327 missing substrates stay missing. These counts concern all device/component records, including cited work, proposed devices and simulations; the default measured-own-work qubit population is smaller.

## Reproduce and verify

From the SQbits repository:

```sh
python scripts/build_category_fixes.py
python scripts/test_material_normalization.py
npm test
SQBITS_TEST_CATEGORY_NETWORK=1 node tests/category-fixes-smoke.mjs
```

The browser check requires the local Vite server at port 5194, or `SQBITS_TEST_URL`. The builder only writes the separate package directory. Gzip payloads and ZIP entries have fixed timestamps for reproducibility. Unit checks validate every changed observation against its immutable source, payload/source hashes, grouping denominators, retained wording and rejection of stale fixes.

## Layout cooling adjustment

Both native Helios GPU layouts now use `alphaDecay = 0.006`. A full cooling cycle takes approximately 1,148 force steps from alpha 1 to 0.001, compared with 342 at the previous 0.02 setting and approximately 2,300 at the native 0.003 default. Actual elapsed time depends on GPU and graph size. The same decay applies after reheating and 2D/3D changes; native positions, filters and the layout engine are retained.
