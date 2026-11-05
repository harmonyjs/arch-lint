# tsconfig-strict

**Pack:** hygiene · **Engine:** manifest · **Default severity:** error

The effective `compilerOptions` (with `extends` resolved) contain no relaxation
of strictness. Weakening type strictness undermines architectural guarantees.

## Options

- `preset` (`'strictest'|'strict'|'recommended'`, default `'strictest'`):
  - `recommended` — `strict`.
  - `strict` — `recommended` plus `noUncheckedIndexedAccess` and
    `noImplicitOverride`.
  - `strictest` — `strict` plus `noImplicitReturns`,
    `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes` and
    `noPropertyAccessFromIndexSignature`.
- `additionalFlags` (string[], default `[]`) — flags to add to the required set.
- `ignoreFlags` (string[], default `[]`) — flags to remove from the required set.

## Good

The default `strictest` preset:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

## Bad

```jsonc
{ "compilerOptions": { "strict": false } }
```

## Edge cases

- `extends` is resolved: a key from the base config counts. The `location` of a
  flag not set in the file itself points at the `extends` line; without
  `extends` it falls back to the start of the file.
- A flag that the project's TypeScript turns on by itself (`strict` as of 6.0)
  counts as enabled even without an entry in the file. The major version is read
  from the nearest `node_modules/typescript/package.json` above `project.cwd`;
  if TypeScript is not found, the flag must be set explicitly.
- Flags implied by `strict` (such as `strictNullChecks`) are accepted when
  `strict` is `true`.
- `skipLibCheck` and `noUnusedLocals` are not in any preset; add them through
  `additionalFlags`.
- A missing `tsconfig.json` is a no-op.
