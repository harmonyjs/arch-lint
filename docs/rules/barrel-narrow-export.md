# barrel-narrow-export

Pack `barrels` · engine `syntactic` · default `warning`.

Applies **only** to component-folder barrels (role-folder barrels are
aggregators — exempt). The barrel of folder `X/` legitimately re-exports the
entity `X`.

Options (D7): `allowPrefixedConstants` — also allow bindings prefixed with the
entity name (`X`, `XDefaults`, `XContext`); `allowTypeReexports` — type-only
re-exports (`export type {…}`) are exempt.

Single-occurrence — one verdict per barrel, no fingerprint.
