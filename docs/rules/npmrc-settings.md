# npmrc-settings

**Pack:** hygiene · **Engine:** manifest · **Default severity:** error

`.npmrc` содержит требуемые пары ключ-значение. Нестрогий `.npmrc` допускает
невоспроизводимый install.

## Опции

- `required` (`Record<string, string|boolean>`, дефолт
  `{ 'engine-strict': true, 'save-exact': true }`) — требуемые пары.
  - `engine-strict=true` — npm отклоняет install при несовпадении node/npm.
  - `save-exact=true` — будущие install пишут точные версии (иначе
    `exact-dependency-versions` снова покраснеет).

## Good

```ini
engine-strict=true
save-exact=true
```

## Bad

```ini
engine-strict=false        ; неверное значение
                           ; save-exact не задан
```

## Edge cases

- Отсутствие `.npmrc` флагует все требуемые ключи как отсутствующие.
- Значения сравниваются строково: `true` (boolean-опция) ≡ `"true"` в `.npmrc`.
