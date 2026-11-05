# unit-cohesion

Pack `metrics` · engine `graph` · default `warning`.

Cohesion of a unit is the share of its entity files that import a sibling file
of the same unit. Files that sit together but never reference each other are a
folder, not a unit. Barrels and entry files do not count as members. The rule
flags a unit whose cohesion is below `min`.

## Options

- `min` (number, default 0.3) - the lowest cohesion tolerated.
- `ignoreUnits` (string[], default `[]`) - units that are deliberately a
  registry of independent files, such as a collection of standalone helpers.
