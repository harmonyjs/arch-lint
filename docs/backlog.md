# Improvement Backlog

Deferred improvements — work that was consciously postponed, with enough context
to pick it up cold later. Each entry records *what*, *why it was deferred*, and
*where in the code* it lives.

## Metrics pack — declarative subsystem-unit redesign

**What.** The metrics pack (`afferent-coupling`, `efferent-coupling`,
`instability`, `subsystem-cohesion`, `cross-cutting-concern`) folds the import
graph per "subsystem". `subsystemOf` (`src/platform/graph/subsystem-coupling.ts`)
defines a subsystem **positionally** — the first path segment under the source
root, or, since the layer extraction, the first two segments when the first is a
declared layer (a stopgap). This is fragile: it breaks whenever a project
introduces a new directory level, and it cannot pick a meaningful unit for
flat / layered / feature-sliced / monorepo layouts uniformly.

**Why deferred.** It is a product-design effort larger than the refactor that
surfaced it. It needs its own spec via brainstorming.

**Direction (research already done).** Consensus across ArchUnit (slices —
pattern with a capture group), dependency-cruiser (depth-agnostic),
eslint-plugin-boundaries (declared element types) and Sonargraph (declared
artifacts): the unit of measurement must be **declared**, not derived from path
depth. `arch-lint` already has the right shape next to the wrong one — `layerOf`
is declarative (longest-prefix match against `layers`); `subsystemOf` is not.
Barrel-derived units were investigated and rejected — `arch-lint` carries
barrels at every nesting level, so "nearest barrel" yields micro-subsystems and
"shallowest barrel" yields layers.

Also in scope for that redesign:
- **`cross-cutting-concern` rework.** It currently fires on a single signal —
  "imported by ≥ N subsystems" — which flags a legitimate shared kernel (a types
  module, a logger) the same as a god-module. The smell is a *conjunction*: high
  Ca ∧ high Ce ∧ low cohesion ∧ wide subsystem dispersion ∧ low abstractness.
- **`instability` / `subsystem-cohesion` granularity.** Both are meaningless on a
  coarse unit (a whole layer is a deliberate grab-bag). They are only valid on a
  cohesive module.

**Consequence until it lands.** The `metrics` pack is intentionally absent from
`arch-lint`'s own self-lint (`arch-lint.config.ts`) — it false-positives on this
codebase's granular structure. The pack still ships for downstream use. Putting
`metrics` back into the self-lint `packs` is the done-signal for this redesign.

## Metrics / graph — minor cleanups

Surfaced by the `/simplify` gate during the arch-refactor; deferred as premature
now (the redesign above will likely rework this surface anyway).

- **Shared triple-memo helper.** `subsystemCoupling`
  (`src/platform/graph/subsystem-coupling.ts`) and `analyzeMetrics`
  (`src/rules/metrics/analyze.ts`) carry a near-identical nested-WeakMap
  get-or-create walk keyed on `(graph, layers, sourceRoot)`. Two sites today —
  not worth a generic `memoTriple` helper yet; revisit if a third appears.
- **`subsystemOf` recomputation.** `subsystemOf` is evaluated roughly `2N + 5E`
  times per run (across `computeSubsystemCoupling`, `cohesiveFilesOf`,
  `cross-cutting-concern`) for only `N` distinct file ids. A per-`(graph, layers,
  sourceRoot)` `fileId → subsystem` memo map would dedupe it. Sub-millisecond on
  `arch-lint`'s own graph; measurable on large monorepos.
- **Metrics-rule test helpers fake an invalid `ResolvedConfig`.** The `cfg`-style
  helpers in the `afferent-coupling`, `efferent-coupling`, `instability`,
  `subsystem-cohesion` and `analyze` tests build a `ResolvedConfig` with `layers`
  omitted (`as ResolvedConfig` cast). `ResolvedConfig.layers` is non-optional, so
  this is the only reason `analyzeMetrics` keeps a `?? NO_LAYERS` fallback for an
  otherwise-unreachable branch. Making the test helpers honest lets `analyze.ts`
  trust the type and drop its `NO_LAYERS` constant. Deferred: the metrics redesign
  reworks `analyzeMetrics` and these tests anyway.
