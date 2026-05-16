# no-default-export

**Pack:** perfile · **Engine:** perfile · **Default severity:** error

`export default` запрещён — у default-экспорта нет канонического имени, импортёр
зовёт сущность как угодно. Правило энфорсит предпочтение basename-именованного
главного экспорта (§9). Фреймворки, требующие default (страницы Next.js), —
через `exemptPaths`.

## Опции

- `exemptPaths` (string[], дефолт `[]`) — glob-пути, где `export default` допустим.

## Good

```ts
export function Button() { return null; }
```

## Bad

```ts
export default function Button() {}
const x = 1; export { x as default };
```

## Edge cases

- Ловит обе формы: `export default <decl>` и `export { x as default }`.
- `export = ...` (CJS) вне scope — не флагуется.
