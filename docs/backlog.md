# Improvement Backlog

Deferred improvements — work that was consciously postponed, with enough context
to pick it up cold later. Each entry records *what*, *why it was deferred*, and
*where in the code* it lives.

## suppress parsing still depends on ts-morph AST

- **What:** `foundation/suppress/` no longer imports `foundation/ts-project` —
  index construction is decoupled through `EntityResolver.sourceFileFor`. But
  the @arch-decision *parsing* itself is still ts-morph-bound: `parse.ts`,
  `anchor.ts` and `collect-comments.ts` consume a ts-morph `SourceFile` AST
  directly. So suppress is not yet a fully ts-morph-free library.
- **Why deferred:** the resolver-interface decoupling was the scoped change.
  Making the parse layer ts-morph-free needs an abstraction over comment / JSDoc
  scanning — a separate design, not a follow-on edit.
- **Where:** `src/foundation/suppress/{parse,anchor,collect-comments}.ts`.
- **Trigger:** when suppress must run in a context that has no ts-morph project.

## entity-id/test-file.ts → file-classification

- **What:** `foundation/entity-id/` holds path arithmetic (`path-arithmetic.ts`,
  `segments.ts`) plus `test-file.ts` — a basename predicate that classifies test
  files. `test-file.ts` is a filename predicate, not arithmetic over a path id.
- **Why deferred:** with a single filename predicate the file is fine where it
  is — small, and topically related under "properties of an entity id".
- **Where:** `src/foundation/entity-id/test-file.ts`.
- **Trigger:** when a second filename predicate appears (e.g. a storybook,
  fixture or config-file classifier). At that point move `test-file.ts` into a
  new `foundation/file-classification/` and keep `entity-id/` pure path
  arithmetic. Do the split then — do not let two predicates pile up in
  `entity-id/` first.

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
