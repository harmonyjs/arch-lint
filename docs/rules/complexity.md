# complexity

**Pack:** perfile · **Engine:** perfile · **Default severity:** warning

Когнитивная сложность функции не превышает `max`. Метрика — **cognitive
complexity** SonarSource: штрафует вложенность и разрывы потока управления, а не
число путей; коррелирует с «функцию пора декомпозировать» лучше цикломатической.

**Нормативный источник:** _«Cognitive Complexity — A new way of measuring
understandability»_, G. Ann Campbell, SonarSource (ред. 2018).

## Инкременты

- **+1 (structural)** — `if`, `else if`, `else`, `?:`, `switch`, `for`, `for-in`,
  `for-of`, `while`, `do-while`, `catch`.
- **+ nesting** — дополнительно к structural за каждый уровень вложенности
  (`if`/`?:`/`switch`/циклы/`catch`/вложенная функция); `else`/`else if` —
  без nesting-инкремента.
- **+1 (hybrid)** — каждая последовательность булевых операторов (`&&`-цепочка,
  `||`-цепочка; смена оператора — новая).
- **+1** — рекурсия.
- **+1** — `break`/`continue` с меткой.
- **Не считаются:** объявление функции, `try`/`finally`, безметочные
  `break`/`continue`, `??`, optional chaining.

## Опции

- `max` (number, дефолт 15) — порог сложности.

## Good

Функция с линейным потоком и сложностью ≤ 15.

## Bad

Функция с тройной вложенностью `if` и смешанными `&&`/`||` — сложность > 15.
