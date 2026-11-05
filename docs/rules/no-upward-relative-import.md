# no-upward-relative-import

Pack `structure` · engine `syntactic` · default `warning`.

An import whose module specifier starts with `../` climbs out of its own
directory. A climbing relative path hides a cross-folder dependency that
belongs in a named alias namespace: the deeper the climb, the harder it is to
see, at a glance, which subsystem a file actually depends on. The rule reads the
literal specifier text from the AST — after an alias migration `#graph/types.js`
and `../../graph/types.js` resolve to the same module, so only the source text
distinguishes them.

The trigger is exactly the `../` prefix. Same-folder (`./…`), downward
(`./sub/…`), subpath-alias (`#…`), and bare-package (`zod`, `node:fs`) imports
are all fine. A specifier that begins with `..` but not `../` (e.g. `..foo`) is
not climbing and is left alone. Re-exports (`export … from '../x.js'`) and
type-only imports (`import type { X } from '../x.js'`) are treated identically
to a plain import — one diagnostic each.

## Good

```ts
import { helper } from './helper.js'; // same folder
import { thing } from './sub/thing.js'; // downward
import type { Diagnostic } from '#types.js'; // subpath alias
import { z } from 'zod'; // bare package
```

## Bad

```ts
import x from '../../graph/types.js'; // climbs out of its directory
export { y } from '../y.js'; // re-export climbs too
```

Option: `aliasPrefix` (string, default `'#'`) — the subpath-alias prefix named
in the suggestion text. It does **not** affect detection; the trigger is always
the literal `../` prefix. When the climbing specifier resolves to a path inside
`sourceRoot`, the suggestion names the concrete `<aliasPrefix><target>` import
to switch to.

Edge cases: a file directly in `sourceRoot` has no parent folder inside the
source tree, so it can never produce a climbing import. Test files and
`test-support/` are in arch-lint's `ignore` set and never reach the graph — the
rule does not lint them. `bin/` lives outside `sourceRoot` and is not examined.

Fix it for real: replace the climbing import with a named alias import. Adding
more `../` segments or raising tolerance is not a fix.
