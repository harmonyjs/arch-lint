# Improvement Backlog

Deferred improvements — work that was consciously postponed, with enough context
to pick it up cold later. Each entry records *what*, *why it was deferred*, and
*where in the code* it lives.

## Metrics / graph — minor cleanups

Surfaced by the `/simplify` gate during the arch-refactor; deferred as premature.

- **Shared triple-memo helper.** `unitCoupling`
  (`src/platform/graph/unit-coupling.ts`) and `analyzeMetrics`
  (`src/rules/metrics/analyze.ts`) carry a near-identical nested-WeakMap
  get-or-create walk keyed on `(graph, units, sourceRoot)`. Two sites today —
  not worth a generic `memoTriple` helper yet; revisit if a third appears.
- **`unitOf` recomputation.** `unitOf` is evaluated roughly `2N + 5E`
  times per run (across `computeUnitCoupling`, `cohesiveFilesOf`,
  `cross-cutting-concern`) for only `N` distinct file ids. A per-`(graph, units,
  sourceRoot)` `fileId → unit` memo map would dedupe it. Sub-millisecond on
  `arch-lint`'s own graph; measurable on large monorepos.
