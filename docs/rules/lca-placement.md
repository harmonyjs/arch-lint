# lca-placement

Pack `placement` · engine `structural` · default `warning`.

An entity must reside **within the subtree rooted at the LCA of its consumers**
(spec §7.2) — no consumer should have to climb above that LCA to reach it. The
rule flags an entity placed _above_ its LCA (scoped wider than needed) or in a
_cousin_ branch (a consumer cannot reach it without crossing above the LCA).

The invariant is architecture-neutral: it names no role folders and proposes no
exact target file — only the LCA directory the entity should move under. A
project with a flat entity tree (no nested component-folders, as in arch-lint
itself) has every entity's LCA at the layer root, so the rule is satisfied
trivially — there is no locality to measure.

Thin projection of `analyzePlacement` (§7.3 branch 4). Cross-layer mismatches
are delegated to `layer-boundary`; the optional `slots/`/`items/` placement
convention is checked by `slots-privacy` / `empty-items-folder`.
