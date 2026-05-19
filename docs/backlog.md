# Improvement Backlog

Deferred improvements — work that was consciously postponed, with enough context
to pick it up cold later. Each entry records *what*, *why it was deferred*, and
*where in the code* it lives.

## Rules as data — a declarative DSL

- **What:** a declarative DSL for the subset of rules shaped "traverse X, test
  predicate Y, emit Diagnostic Z". Those rules are near-identical scaffolding
  around a small predicate.
- **Why deferred:** not a continuation of the current refactor — a speculative
  direction, accepted for consideration only on a concrete operational trigger.
- **Where:** `src/rules/` — the thin rules (placement, and several syntactic
  rules of the same shape).
- **Trigger:** when the count of rules of that shape grows enough that the
  boilerplate measurably slows adding a new one.

## Stages and cache as a first-class concept

- **What:** turn the `check` pipeline into an explicit stage graph with
  invalidators, instead of a fixed sequence of calls.
- **Why deferred:** not a continuation of the current refactor — a speculative
  direction, accepted for consideration only on a concrete operational trigger.
- **Where:** `src/runner/check.ts` — the pipeline.
- **Trigger:** when run time starts to hurt on real user projects.
