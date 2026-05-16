# no-wildcard-reexport

Pack `barrels` · engine `syntactic` · default `error`.

Forbids `export * from '…'` and `export * as ns from '…'`. Wildcard re-exports
make the syntactic resolver non-deterministic (`export *` ambiguity) and widen a
barrel's public surface without bound. The fix is explicit named re-exports
`export { A, B } from '…'`.

Multi-occurrence — fingerprint `<file>#<source specifier>#<ns name | '*'>`.
