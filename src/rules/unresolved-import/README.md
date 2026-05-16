# unresolved-import

Pack `meta` · engine `meta` · default `warning`.

Reports every entry in `graph.unresolved` — internal imports the syntactic
resolver could not unwind. A lost edge silently undercounts an entity's
consumers and can flip an `lca-placement` verdict, so it must surface.
Fingerprint: `<file>#<import specifier>#<symbol>`.
