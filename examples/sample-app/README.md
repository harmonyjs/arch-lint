# sample-app

A small, realistic TypeScript project that `arch-lint` checks **cleanly** —
zero violations, exit code `0`, no baseline. It is the canonical "here is
arch-lint working on a real project" demo, kept separate from the in-repo test
fixtures.

## What it shows

A three-layer architecture where dependencies only ever point downward:

```
src/app      →  the entry layer        (main.ts)
src/domain   →  business logic         (greeting-service.ts, clock/)
src/support  →  pure, dependency-free  (strings.ts, numbers.ts)
```

- **layers** — `app` may import `domain` and `support`; `domain` may import
  `support`; `support` imports nothing. A reverse edge would fail the check.
- **barrels** — `src/domain/clock/` is a folder with an `index.ts` barrel.
  External layers import the folder through its barrel
  (`import { ClockDisplay } from '../domain/clock/index.js'`); the folder
  internal `format.ts` is never imported directly. The barrel re-exports its
  public entity by name — no wildcard `export *`.
- **placement** — every entity sits at the lowest common ancestor of its
  consumers, so no entity needs to be promoted or hidden.
- **meta** — every internal import resolves; there is nothing unresolved and no
  expired suppression.

## Layout

```
examples/sample-app/
  arch-lint.config.ts        arch-lint config (defineConfig, relative source import)
  tsconfig.json              strict NodeNext tsconfig
  src/
    app/
      main.ts                entry point — composes domain + support
    domain/
      greeting-service.ts    domain service over the support layer
      clock/
        index.ts             barrel — re-exports ClockDisplay
        clock-display.ts     public entity of the clock folder
        format.ts            folder internal — reached only through the barrel
    support/
      strings.ts             pure string helper
      numbers.ts             pure number helper
```

## Linting the example

Run `arch-lint` with the example as the working directory:

```sh
(cd examples/sample-app && node ../../bin/arch-lint.js check)
```

It prints `No architecture violations found.` and exits `0`.

From the repository root, `just example` builds `arch-lint` and runs the same
check.

## Note on the `perfile` pack

`perfile` is intentionally not enabled. Its `file-description-required` rule
cannot see a `/** @fileoverview */` block on a file whose first statement is an
`import` or a re-export (`export … from`) — those node kinds carry no JSDoc in
the parser. arch-lint's own clean e2e fixture omits `perfile` for the same
reason. Every file here still opens with a proper `@fileoverview` block as good
practice.
