# file-description-required

**Pack:** perfile · **Engine:** syntactic · **Default severity:** error

Every file must open with a leading multiline JSDoc block `/** */` that carries
the `@fileoverview` tag and a meaningful description. The goal is an
_evergreen_ description: the lasting purpose of the file, not transient
implementation details.

## Options

- `tag` (string, default `@fileoverview`) — the required JSDoc tag.
- `minLength` (number, default 12) — minimum length of the text after the tag
  (trimmed); `0` disables the check.

## Good

```ts
/**
 * @fileoverview Loads and caches the user profile data layer.
 */
export const profile = loadProfile();
```

## Bad

```ts
export const profile = loadProfile(); // no JSDoc block
/** @fileoverview Loads data. */ // single-line: not accepted
```

## Edge cases

- A shebang (`#!/usr/bin/env node`) above the block is allowed.
- A single-line `/** @fileoverview … */` is not accepted; the block must span
  several lines.
- The description is the text after the tag up to the end of the block, with the
  leading `*` of each line stripped.
