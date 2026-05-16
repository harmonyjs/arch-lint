# exact-dependency-versions

**Pack:** hygiene · **Engine:** manifest · **Default severity:** error

`dependencies`/`devDependencies` закреплены на точных версиях — ни `^`, ни `~`,
ни диапазона, ни dist-тега. Range-версии делают сборку невоспроизводимой между
install. `peerDependencies`/`optionalDependencies` исключены — диапазон там
легитимен.

## Опции

- `sections` (string[], дефолт `['dependencies', 'devDependencies']`) —
  проверяемые секции. `peerDependencies`/`optionalDependencies` исключаются всегда.

## Good

```jsonc
{ "dependencies": { "zod": "4.4.3" } }
```

## Bad

```jsonc
{ "dependencies": { "zod": "^4.4.3", "ts-morph": "latest" } }
```

## Edge cases

- `workspace:`, `file:`, `link:`, `git+`, `github:`, URL-протоколы — пропускаются
  (это не npm-range).
- `peerDependencies` не флагуется, даже если перечислен в `sections`.
