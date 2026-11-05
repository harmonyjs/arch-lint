# complexity

**Pack:** perfile · **Engine:** syntactic · **Default severity:** warning

The cognitive complexity of a function does not exceed `max`. The metric is
SonarSource's **cognitive complexity**: it penalizes nesting and breaks in
control flow rather than counting paths, and it tracks "this function should be
decomposed" better than cyclomatic complexity does.

**Normative source:** _"Cognitive Complexity — A new way of measuring
understandability"_, G. Ann Campbell, SonarSource (2018 revision).

## Increments

- **+1 (structural)** — `if`, `else if`, `else`, `?:`, `switch`, `for`, `for-in`,
  `for-of`, `while`, `do-while`, `catch`.
- **+ nesting** — added on top of the structural increment for each level of
  nesting (`if`, `?:`, `switch`, loops, `catch`, nested function); `else` and
  `else if` get no nesting increment.
- **+1 (hybrid)** — each sequence of boolean operators (a chain of `&&` or a
  chain of `||`; switching operator starts a new sequence).
- **+1** — each recursive call (a call to the function's own name).
- **+1** — each labeled `break` or `continue`.
- **Not counted:** the function declaration itself, `try`/`finally`, unlabeled
  `break`/`continue`, `??`, optional chaining.

## Options

- `max` (number, default 15) — complexity threshold.

## Good

A function with linear flow and complexity ≤ 15.

## Bad

A function with three levels of nested `if` and mixed `&&`/`||` that scores
above 15.

## Edge cases

- Each function (declaration, method, arrow, function expression) is scored and
  reported on its own; the fingerprint is `<file>#<qualified function path>`.
