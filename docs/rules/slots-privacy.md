# slots-privacy

Pack `placement` · engine `structural` · default `error`.

An entity placed under a `slots/` folder is private to its owning entity — only
the owner may import it. Thin projection of `analyzePlacement` (§7.3 branch 1,
n-independent). Catching this as `error` (not `warning`) is why branch 1 runs
before the LCA branch.
