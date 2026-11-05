# package-engines

**Pack:** hygiene · **Engine:** manifest · **Default severity:** error

`package.json` объявляет требуемые ключи `engines`. Необъявленный движок делает
воспроизводимость сборки негарантированной.

## Опции

- `requiredKeys` (string[], дефолт `['node', 'npm']`) — требуемые ключи `engines`.

## Good

```jsonc
{ "engines": { "node": ">=22.12", "npm": ">=10" } }
```

## Bad

```jsonc
{ "engines": { "node": ">=22.12" } } // npm не объявлен
```

## Edge cases

- Отсутствие `package.json` — no-op.
- Каждый отсутствующий ключ — отдельная диагностика с fingerprint = ключ.
