# hooks-folder-required

Pack `view` · engine `syntactic` · default `error`.

`use-*` files must live in a `hooks/` folder. The hook file name is given by
`hookFilePattern` (regex) — the pack is parametrized by config, no hardcoding.

Options (D7): `hookFilePattern` — regex of a hook file name; `strictCheck` —
`true` additionally flags a file inside `hooks/` whose name does NOT match the
pattern (a `hooks/` folder must contain only hook files); `false` flags only
`use-*` files outside `hooks/`. Barrel files inside `hooks/` are always exempt.

Multi-occurrence — fingerprint `<offending file>`.
