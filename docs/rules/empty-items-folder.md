# empty-items-folder

Pack `placement` · engine `structural` · default `warning`.

An entity placed under a shared `items/` folder should serve at least
`promotionThreshold` consumers; below the threshold it belongs in a private
`slots/` folder instead. Part of the optional role-folder placement convention
(spec §7.3): the rule fires only on projects that use `items/` folders. Thin
projection of `analyzePlacement` (§7.3 branch 2).
