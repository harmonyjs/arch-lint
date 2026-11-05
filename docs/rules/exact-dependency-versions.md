# exact-dependency-versions

**Pack:** hygiene · **Engine:** manifest · **Default severity:** error

`dependencies` and `devDependencies` are pinned to exact versions: no `^`, no
`~`, no range, no dist-tag. Range versions make a build non-reproducible across
installs. `peerDependencies` and `optionalDependencies` are excluded, because a
range is legitimate there.

## Options

- `sections` (string[], default `['dependencies', 'devDependencies']`) — the
  sections to check. `peerDependencies` and `optionalDependencies` are always
  excluded.

## Good

```jsonc
{ "dependencies": { "zod": "4.4.3" } }
```

## Bad

```jsonc
{ "dependencies": { "zod": "^4.4.3", "ts-morph": "latest" } }
```

## Edge cases

- Specs starting with `workspace:`, `file:`, `link:`, `npm:`, `git+`, `github:`,
  `http:` or `https:` are skipped (they are not npm ranges).
- A pre-release suffix such as `1.2.3-beta.1` counts as exact.
- `peerDependencies` is never flagged, even if listed in `sections`.
- The fingerprint is `<section>#<package>`.
