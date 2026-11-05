# afferent-coupling

Pack `metrics` · engine `graph` · default `info`.

Afferent coupling (Ca) of a unit is the number of other units that import it.
A unit many others depend on is a high-blast-radius change point. The rule
flags a unit whose Ca exceeds `max`.

## Options

- `max` (number, default 6) - the highest Ca tolerated.
- `allow` (string[], default `[]`) - units exempt by role, such as a shared
  kernel that exists to be depended on.
