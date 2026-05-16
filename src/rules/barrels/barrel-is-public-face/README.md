# barrel-is-public-face

Pack `barrels` · engine `syntactic` · default `error`.

An external file must import a component-folder's entity through its barrel, not
a folder internal directly.

Options (D7): `allowExplicitIndex` — `false` makes an import via an explicit
index path (`'./X/index'`) a violation; `allowSiblingImports` — `true` lets
files inside one component folder import each other's internals;
`enforceForSegments` — `'all'` or a list of the producer's role segments.

Multi-occurrence — fingerprint `<consumer file>#<producer file>`.
