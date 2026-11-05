# max-lines-per-function

**Pack:** perfile · **Engine:** syntactic · **Default severity:** warning

The number of lines in a single function does not exceed `max`. A long function
is hard to read and signals that it should be decomposed.

## Options

- `max` (number, default 60) — limit on the lines of a function.

## Good

A 20-line function with a single responsibility.

## Bad

A 120-line function that does five different things.

## Edge cases

- The count is the span from the function's first line to its last, inclusive.
  Blank and comment lines inside it are counted, and there are no skip options.
- Nested functions are checked separately; their lines also count toward the
  enclosing function.
- The fingerprint is `<file>#<qualified function path>`: renaming a function
  produces a new fingerprint, so the violation correctly becomes `new`.
