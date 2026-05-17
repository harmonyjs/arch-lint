# prefix-cluster-folder

Pack `structure` · engine `graph` · default `warning`.

Three or more files in one directory whose names share a `<prefix>-` segment are
a hidden subsystem with no folder of its own. The rule groups the direct,
non-test files of each directory by the segment of their name before the first
`-`; a group of `min` files or more (default `3`) raises one diagnostic per
`(directory, prefix)` pair.

A file whose name has no `-` — including a file named exactly `<prefix>.<ext>` —
has no prefix and never joins a cluster. Test files (`*.test.*`) are skipped: a
test follows its subject and moves with it. The check is non-recursive — only
the direct children of a directory are grouped.

Option: `min` (number, default `3`) — the cluster size that triggers the rule.

Fix it for real: create the `<prefix>/` subfolder, move the clustered files in,
and update their imports. Raising `min` to silence a genuine cluster is not a fix.
