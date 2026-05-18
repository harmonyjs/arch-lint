# Improvement Backlog

Deferred improvements — work that was consciously postponed, with enough context
to pick it up cold later. Each entry records *what*, *why it was deferred*, and
*where in the code* it lives.

## Per-rule integration-test coverage

**What.** Extend the existing `integration.test.ts` pattern — build a real graph
(`resolveConfig` → `buildGraph` → `loadSourceFiles`) over a fixture project and
assert the rule's diagnostics — to *every* rule, not just the three that have it
today (`no-wildcard-reexport`, `barrel-is-public-face`, `ui-cluster-membership`).
Add one holistic canary fixture that violates many rules at once, run a full
`check`, and assert the expected diagnostic set.

**Why deferred.** Its own initiative, larger than the A+B+C layer-boundary fix it
was discovered during. Needs a design pass: which fixtures, snapshot vs explicit
assertions, how to keep the suite maintainable. Bolting it onto the fix commit
would be scope creep.

**Why it matters.** `layer-boundary` was silently dead on arch-lint's own config
(layer keys lacked the `sourceRoot` prefix `layerOf` expected) while its unit
tests stayed green — they hand-pick the id format and config keys. Rules with an
integration test build the graph the real way and are structurally protected;
rules without one are not. A per-rule integration suite closes that whole class
of "rule went dark unnoticed" bug.

**Where.** Pattern to copy: `src/rules/barrels/no-wildcard-reexport/tests/integration.test.ts`
with `src/rules/barrels/no-wildcard-reexport/fixtures/`. Seed added during the
fix: `src/rules/layers/layer-boundary/tests/integration.test.ts`.
