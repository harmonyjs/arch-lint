# siblings-forbidden

Pack `placement` · engine `structural` · default `error`.

Two entities that are siblings under a shared component parent must not import
each other sideways — the shared dependency belongs at their common ancestor.
Thin projection of `analyzePlacement` (§7.3 branch 3); on a flat entity tree
with no component parents it never fires.
