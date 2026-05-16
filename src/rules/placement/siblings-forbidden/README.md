# siblings-forbidden

Pack `placement` · engine `structural` · default `error`.

Two entities that are siblings under a shared component parent must not import
each other sideways — the shared dependency belongs in `items/`. Thin projection
of `analyzePlacement` (§7.3 branch 3).
