# max-lines-per-function

**Pack:** perfile · **Engine:** perfile · **Default severity:** warning

Число строк отдельной функции не превышает `max`. Длинная функция плохо
читается — сигнал, что её пора декомпозировать.

## Опции

- `max` (number, дефолт 60) — лимит строк функции.

## Good

Функция в 20 строк с одной ответственностью.

## Bad

Функция в 120 строк, делающая пять разных вещей.

## Edge cases

- fingerprint — `<файл>#<qualified function path>`: ренейм функции даёт новый
  fingerprint, нарушение корректно становится `new`.
