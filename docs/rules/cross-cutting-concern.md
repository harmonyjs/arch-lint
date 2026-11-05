# cross-cutting-concern

Pack `metrics` · engine `graph` · default `info`.

Flags a god-module: a unit with high afferent coupling AND high efferent
coupling AND low internal cohesion AND low abstractness at once. The four-signal
conjunction separates it from a legitimate shared kernel; a types module trips
Ca but not Ce or abstractness.

## Options

- `minCa` (number, default 5) - the lowest Ca that counts as high.
- `minCe` (number, default 4) - the lowest Ce that counts as high.
- `maxCohesion` (number, default 0.3) - the highest cohesion that counts as low.
- `maxAbstractness` (number, default 0.5) - the highest abstractness that
  counts as low.
- `allow` (string[], default `[]`) - deliberate shared kernels.
