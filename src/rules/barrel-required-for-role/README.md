# barrel-required-for-role

Pack `barrels` · engine `syntactic` · default `error`.

D6: the rule checks **two** folder classes — role folders (name ∈
`conventions.*Segment`) and component folders (a folder with a same-name entry).
Each must contain a barrel file from `conventions.indexFiles`.

Options: `enforceForSegments` (`'all'` | a list of role segments — narrows the
role-folder check; component folders are always checked), `exemptPaths`
(excluded folder ids).

Single-occurrence — one verdict per folder, no fingerprint.
