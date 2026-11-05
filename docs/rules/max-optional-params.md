# max-optional-params

**Pack:** perfile · **Engine:** perfile · **Default severity:** warning

Число опциональных и default-параметров функции не превышает `max`. Ортогонально
`max-params`: тот считает все параметры, этот — только опциональные. Ловит
options-creep: функция обрастает флагами вместо переработки сигнатуры.
Идиоматичный одиночный `opts?` порог 3 не трогает.

## Опции

- `max` (number, дефолт 3) — лимит опциональных параметров.

## Good

```ts
function fetch(url: string, opts?: FetchOptions) {}
```

## Bad

```ts
function fetch(url, retry?, cache?, signal?, verbose?) {} // 4 опциональных
```

## Edge cases

- Параметр с `?` и параметр с инициализатором (`= value`) оба считаются опциональными.
- Required-параметры не считаются.
