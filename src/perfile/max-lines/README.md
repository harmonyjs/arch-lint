# max-lines

**Pack:** perfile · **Engine:** perfile · **Default severity:** warning

Число строк файла не превышает `max`. Крупный файл — сигнал плохой декомпозиции
сущности, а не стиля.

## Опции

- `max` (number, дефолт 200) — лимит строк.
- `skipComments` (boolean, дефолт `true`) — не считать строки-комментарии.
- `skipBlankLines` (boolean, дефолт `true`) — не считать пустые строки.

## Good

Файл ≤ 200 значимых строк.

## Bad

Файл с 350 строками кода — пора делить.

## Edge cases

- При `skipComments`/`skipBlankLines = false` соответствующие строки считаются.
