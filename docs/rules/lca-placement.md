# lca-placement

Pack `placement` · engine `structural` · default `warning`.

An entity must live in the least common ancestor of its consumers, within its
own layer. Thin projection of `analyzePlacement` (§7.3 branch 4). Cross-layer
mismatches are delegated to `layer-boundary`; private-slot and underused-shared
cases are delegated to `slots-privacy` / `empty-items-folder`.
