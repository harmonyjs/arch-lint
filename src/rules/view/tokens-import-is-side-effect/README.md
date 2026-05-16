# tokens-import-is-side-effect

Pack `view` · engine `syntactic` · default `warning`.

Files under a `tokens/` folder are imported as side-effects only
(`import '…/tokens/…'` with no bindings) — design tokens are applied globally,
not consumed as values.

Options: `allowedImporters` — a list of paths (a file id or a per-segment
prefix) permitted any tokens import; `requiredForm` — `'side-effect'` (the only
supported form).

Multi-occurrence — fingerprint `<consumer>#<tokens file>`.
