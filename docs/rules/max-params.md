# max-params

**Pack:** perfile · **Engine:** syntactic · **Default severity:** warning

The number of parameters of a function does not exceed `max`. All parameters are
counted. Many parameters signal that the signature is due for a rework.

## Options

- `max` (number, default 4) — parameter limit.

## Good

```ts
function render(node: Node, depth: number) {}
```

## Bad

```ts
function render(node, depth, theme, mode, locale) {} // 5 parameters
```

## Edge cases

- All parameters are counted, including optional and rest parameters.
- To count only optional parameters, see `max-optional-params`.
- The fingerprint is `<file>#<qualified function path>`.
