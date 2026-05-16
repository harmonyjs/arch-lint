# single-entity-per-file

**Pack:** perfile · **Engine:** perfile · **Default severity:** error

Файл экспортирует не более одной сущности — класса или компонента. Прямое
следствие модели «одна сущность — один файл» (§4). Утилиты, типы и константы
не считаются сущностями.

## Опции

Нет.

## Good

```ts
export function Button() { return null; }
export const buttonClass = 'btn';            // не сущность — допустимо
```

## Bad

```ts
export class Store {}
export const Panel = () => null;             // вторая сущность
```

## Edge cases

- Не-экспортируемые классы/компоненты не считаются.
- «Сущность» = экспортируемый `class` либо экспортируемая PascalCase функция/стрелка.
