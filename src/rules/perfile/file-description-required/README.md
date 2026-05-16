# file-description-required

**Pack:** perfile · **Engine:** perfile · **Default severity:** error

Каждый файл обязан открываться лидирующим многострочным JSDoc-блоком `/** */`
с тегом `@fileoverview` и содержательным описанием. Цель — *evergreen*-описание:
устойчивое назначение файла, не преходящие детали реализации.

## Опции

- `tag` (string, дефолт `@fileoverview`) — требуемый JSDoc-тег.
- `minLength` (number, дефолт 12) — мин. длина текста после тега (trimmed); `0` снимает проверку.

## Good

```ts
/**
 * @fileoverview Loads and caches the user profile data layer.
 */
export const profile = loadProfile();
```

## Bad

```ts
export const profile = loadProfile();          // нет JSDoc-блока
/** @fileoverview Loads data. */                // однострочный — не засчитан
```

## Edge cases

- Shebang (`#!/usr/bin/env node`) выше блока допустим.
- Однострочный `/** @fileoverview … */` не засчитывается — нужен реальный блок.
