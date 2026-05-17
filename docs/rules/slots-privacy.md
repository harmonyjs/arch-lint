# slots-privacy

Pack `placement` · engine `structural` · default `error`.

An entity placed under a `slots/` folder is private to its owning entity — only
the owner may import it. Part of the optional role-folder placement convention
(spec §7.3): the rule fires only on projects that actually use `slots/` folders
and is structurally silent otherwise. Thin projection of `analyzePlacement`
(§7.3 branch 1, n-independent). Catching this as `error` (not `warning`) is why
branch 1 runs before the LCA branch.
