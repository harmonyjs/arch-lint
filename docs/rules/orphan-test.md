# orphan-test

Pack `structure` · engine `graph` · default `warning`.

A test file `<name>.test.<ext>` whose directory holds no `<name>` source file is
an orphan — it is co-located with nothing it tests. A co-located test is paired
with its subject; an orphan tests something outside its own folder and belongs
in a dedicated `tests/` directory instead.

The subject of `<name>.test.<ext>` is a sibling file in the same directory whose
extension-stripped name equals `<name>` and which is not itself a test file — so
`Widget.test.tsx` pairs with `Widget.ts` or `Widget.tsx`, and `index.test.ts`
with `index.ts`. A test already inside the `testFolder` directory is exempt: it
is already where orphaned tests belong.

Option: `testFolder` (string, default `'tests'`) — the directory orphaned tests
are relocated into, and inside which they are exempt.

The rule only sees test files that reach the import graph. A project that
`ignore`s its test files — as arch-lint itself does — gets zero diagnostics from
this rule; that is correct, not a miss.
