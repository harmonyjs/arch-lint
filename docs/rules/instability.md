# instability

Pack `metrics` · engine `graph` · default `info`.

Instability of a unit is `I = Ce / (Ca + Ce)`: 0 when only others depend on
it, 1 when it only depends on others. A unit you declare foundational should be
stable. The rule flags a unit listed in `leafUnits` whose instability exceeds
`maxForLeafUnits`; units not listed are never flagged.

## Options

- `leafUnits` (string[], default `[]`) - units asserted to be foundational.
- `maxForLeafUnits` (number, default 0.5) - the highest instability tolerated
  for them.
