# no-default-export

**Pack:** perfile · **Engine:** syntactic · **Default severity:** error

`export default` is forbidden. A default export has no canonical name, so each
importer calls the entity whatever it likes. The rule enforces the preference
for a main export named after the file's basename (§9). Frameworks that require
a default export (Next.js pages) are handled through `exemptPaths`.

## Options

- `exemptPaths` (string[], default `[]`) — glob paths where `export default` is
  allowed.

## Good

```ts
export function Button() {
  return null;
}
```

## Bad

```ts
export default function Button() {}
const x = 1;
export { x as default };
```

## Edge cases

- Both forms are caught: `export default <declaration or expression>` and
  `export { x as default }` (also `export { default } from '…'`).
- `export = ...` (CommonJS) is out of scope and is not flagged.
- At most one diagnostic is reported per file; the fingerprint is the file.
