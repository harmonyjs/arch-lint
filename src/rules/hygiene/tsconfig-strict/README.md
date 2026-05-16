# tsconfig-strict

**Pack:** hygiene · **Engine:** manifest · **Default severity:** error

Эффективный (с разрешённым `extends`) `compilerOptions` не содержит послаблений
строгости. Послабление строгости типов подрывает архитектурные гарантии.

## Опции

- `preset` (`'strictest'|'strict'|'recommended'`, дефолт `'strictest'`):
  - `recommended` — `strict`.
  - `strict` — `recommended` + `noUncheckedIndexedAccess`, `noImplicitOverride`.
  - `strictest` — `strict` + `noImplicitReturns`, `noFallthroughCasesInSwitch`,
    `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`.
- `additionalFlags` (string[]) — добавить флаги в требуемый набор.
- `ignoreFlags` (string[]) — убрать флаги из требуемого набора.

## Good

```jsonc
{ "compilerOptions": { "strict": true, "noUncheckedIndexedAccess": true } }
```

## Bad

```jsonc
{ "compilerOptions": { "strict": false } }
```

## Edge cases

- `extends` резолвится: ключ из base-конфига учитывается, `location` указывает
  на строку `extends` файла.
- `skipLibCheck`/`noUnusedLocals` в дефолт не входят — добавляются `additionalFlags`.
- Отсутствие `tsconfig.json` — no-op.
