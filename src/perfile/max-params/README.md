# max-params

**Pack:** perfile · **Engine:** perfile · **Default severity:** warning

Число параметров функции не превышает `max`. Считаются все параметры. Много
параметров — сигнал, что сигнатуру пора переработать.

## Опции

- `max` (number, дефолт 4) — лимит параметров.

## Good

```ts
function render(node: Node, depth: number) {}
```

## Bad

```ts
function render(node, depth, theme, mode, locale) {}   // 5 параметров
```

## Edge cases

- Считаются все параметры, включая опциональные и rest.
- Для счёта только опциональных см. `max-optional-params`.
