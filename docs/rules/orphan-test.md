# orphan-test

Pack `structure` · engine `census` · default `warning`.

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

The rule runs on the `census` engine: it reads the FileCensus — every project
file surviving the `ignore` globs — so it sees test files even though they are
excluded from the import graph. Test files are kept out of the import graph
structurally (by the `.test.` infix), not via `ignore`. A project that genuinely
wants its test files outside arch-lint's view entirely can still add
`**/*.test.ts` back to `ignore` — that is an explicit opt-out, not the default.
