# max-optional-params

**Pack:** perfile · **Engine:** syntactic · **Default severity:** warning

The number of optional and default-valued parameters of a function does not
exceed `max`. Orthogonal to `max-params`: that rule counts all parameters, this
one counts only the optional ones. It catches options-creep, where a function
accumulates flags instead of getting a reworked signature. The idiomatic single
`opts?` is well under the default limit of 3.

## Options

- `max` (number, default 3) — limit on optional parameters.

## Good

```ts
function fetch(url: string, opts?: FetchOptions) {}
```

## Bad

```ts
function fetch(url, retry?, cache?, signal?, verbose?) {} // 4 optional
```

## Edge cases

- A parameter with `?` and a parameter with an initializer (`= value`) both
  count as optional.
- Required parameters are not counted.
- The fingerprint is `<file>#<qualified function path>`.
