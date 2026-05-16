# lib-purity

Pack `layers` · engine `syntactic` · default `error`.

A generic import-denylist: files under the configured segments must not import
external packages matching `forbiddenImports` (picomatch globs). Import and
`export ... from` declarations are scanned from the parsed source project (D9);
relative imports are ignored. `enforceForSegments` narrows the scope to files
under named role segments (default `'all'`). Fingerprint:
`<file>#<import specifier>#<symbol>`.
