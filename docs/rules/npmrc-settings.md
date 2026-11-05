# npmrc-settings

**Pack:** hygiene · **Engine:** manifest · **Default severity:** error

`.npmrc` contains the required key-value pairs. A lax `.npmrc` permits a
non-reproducible install.

## Options

- `required` (`Record<string, string|boolean>`, default
  `{ 'engine-strict': true, 'save-exact': true }`) — the required pairs.
  - `engine-strict=true` — npm rejects an install when the node or npm version
    does not match `engines`.
  - `save-exact=true` — future installs write exact versions (otherwise
    `exact-dependency-versions` turns red again).

## Good

```ini
engine-strict=true
save-exact=true
```

## Bad

```ini
engine-strict=false        ; wrong value
                           ; save-exact is not set
```

## Edge cases

- A missing `.npmrc` flags every required key as missing.
- Values are compared as strings: `true` (a boolean option) equals `"true"` in
  `.npmrc`.
- Lines starting with `;` or `#` are comments. The fingerprint is the key.
