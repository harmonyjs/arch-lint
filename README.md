# arch-lint

A static architecture linter for TypeScript projects. It builds the import graph
of a project with [ts-morph](https://github.com/dsherret/ts-morph) and checks it
against the architecture you declare: which layers may depend on which, what
leaves a folder only through its barrel, where an entity should live given who
uses it, and how coupled each unit is.

Existing violations go into a baseline file, so a check on a legacy codebase
fails only on what a change introduces.

## Install

```sh
npm install --save-dev --save-exact @avavilov/arch-lint
```

Requires Node.js 22.22 or newer.

## Configure

Create `arch-lint.config.ts` in the project root:

```ts
import { defineConfig } from '@avavilov/arch-lint';

export default defineConfig({
  project: { tsconfig: './tsconfig.json', sourceRoot: 'src' },
  packs: ['layers', 'barrels', 'meta'],
  layers: {
    app: { canImport: ['domain', 'support'] },
    domain: { canImport: ['support'] },
    support: { canImport: [] },
  },
});
```

Layer keys are paths relative to `sourceRoot`. A file belongs to the layer with
the longest matching key; a file outside every layer is not checked by
`layer-boundary`. A key that holds no file, or a `canImport` entry that names no
declared layer, is a config error.

### Monorepos

Point `sourceRoot` at the repository root and give each workspace package its
own layer. An import by package name (`@acme/shared`) that npm links to a folder
inside the repository is an edge to that folder, so package boundaries are
checked like any other layer:

```ts
export default defineConfig({
  project: { tsconfig: './tsconfig.arch-lint.json', sourceRoot: '.' },
  packs: ['layers', 'meta'],
  layers: {
    'packages/shared': { canImport: [] },
    'apps/web': { canImport: ['packages/shared'] },
    'apps/api': { canImport: ['packages/shared'] },
  },
});
```

The tsconfig only has to resolve modules for every package; `node_modules` is
never scanned.

A runnable example lives in [`examples/sample-app`](examples/sample-app).

## Run

```sh
npx arch-lint check                 # full check
npx arch-lint check --changed-only  # only files changed against the git base
npx arch-lint baseline init         # record every current violation
npx arch-lint baseline diff         # what the stored baseline no longer matches
npx arch-lint baseline prune        # drop records that no longer reproduce
npx arch-lint watch                 # re-check on every change
npx arch-lint explain <rule-id>     # print a rule's documentation
```

Exit codes: `0` clean, `1` new blocking violations, `2` invalid config or a
missing baseline file, `3` graph build failure, `4` I/O error, `5` internal error.

On a project with existing violations, run `baseline init` once and commit
`.arch-lint-baseline.json`; from then on `check` fails only on new ones. A
project that is clean from the start sets `baseline: { missingBehavior: 'ignore' }`.

## Rule packs

| Pack        | Rules                                                                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layers`    | `layer-boundary`, `lib-purity`                                                                                                                                       |
| `barrels`   | `barrel-is-public-face`, `barrel-narrow-export`, `barrel-required-for-role`, `no-wildcard-reexport`                                                                  |
| `placement` | `lca-placement`, `siblings-forbidden`, `slots-privacy`, `empty-items-folder`                                                                                         |
| `structure` | `no-upward-relative-import`, `orphan-test`, `prefix-cluster-folder`                                                                                                  |
| `perfile`   | `complexity`, `file-description-required`, `max-lines`, `max-lines-per-function`, `max-params`, `max-optional-params`, `no-default-export`, `single-entity-per-file` |
| `hygiene`   | `exact-dependency-versions`, `npmrc-settings`, `package-engines`, `tsconfig-strict`                                                                                  |
| `view`      | `hooks-folder-required`, `tokens-import-is-side-effect`, `ui-cluster-membership`                                                                                     |
| `metrics`   | `afferent-coupling`, `efferent-coupling`, `instability`, `unit-cohesion`, `cross-cutting-concern`                                                                    |
| `meta`      | `unresolved-import`, `expired-suppress`                                                                                                                              |

Every rule takes a severity (`off`, `info`, `warning`, `error`) or an object
with `severity` and its options under `rules` in the config. The `metrics` pack
measures the units declared under `units`.

## Suppressing a finding

A finding on a single entity can be suppressed with a comment above it that
names the rule and gives a reason of at least 12 characters:

```ts
// @arch-decision[lca-placement]: until 2026-12-31, migration in progress
export function legacyHelper() {}
```

The `until` date is optional; once it passes, the suppression itself becomes an
`expired-suppress` finding.

## Development

```sh
npm install
npm test          # vitest
npm run typecheck
npx biome check .
just lint         # arch-lint checks itself
```

## License

[MIT](LICENSE)
