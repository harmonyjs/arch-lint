# max-lines

**Pack:** perfile · **Engine:** syntactic · **Default severity:** warning

The number of lines in a file does not exceed `max`. A large file signals poor
decomposition of the entity, not a style problem.

## Options

- `max` (number, default 200) — line limit.
- `skipComments` (boolean, default `true`) — do not count comment lines.
- `skipBlankLines` (boolean, default `true`) — do not count blank lines.

## Good

A file of ≤ 200 significant lines.

## Bad

A 350-line file of code: time to split it.

## Edge cases

- With `skipComments` or `skipBlankLines` set to `false`, the corresponding lines
  are counted.
- A comment line is one that starts with `//` or `/*`, or that lies inside a
  block comment. A line of code followed by a trailing comment still counts.
