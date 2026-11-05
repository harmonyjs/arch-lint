# efferent-coupling

Pack `metrics` · engine `graph` · default `warning`.

Efferent coupling (Ce) of a unit is the number of other units it imports. A
unit that depends on many others is hard to extract or test in isolation. The
rule flags a unit whose Ce exceeds `max`.

## Options

- `max` (number, default 4) - the highest Ce tolerated.
- `allow` (string[], default `[]`) - units exempt by role, such as an
  orchestrator whose job is to wire everything together.
