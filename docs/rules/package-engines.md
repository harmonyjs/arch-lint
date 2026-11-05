# package-engines

**Pack:** hygiene · **Engine:** manifest · **Default severity:** error

`package.json` declares the required `engines` keys. An undeclared engine leaves
build reproducibility unguaranteed.

## Options

- `requiredKeys` (string[], default `['node', 'npm']`) — the required `engines`
  keys.

## Good

```jsonc
{ "engines": { "node": ">=22.12", "npm": ">=10" } }
```

## Bad

```jsonc
{ "engines": { "node": ">=22.12" } } // npm is not declared
```

## Edge cases

- A missing `package.json` is a no-op.
- Each missing key is a separate diagnostic whose fingerprint is the key.
- Only the presence of the key is checked, not its value.
