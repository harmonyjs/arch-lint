# expired-suppress

Pack `meta` · engine `meta` · default `warning`.

Reports `@arch-decision` suppress comments that are expired (past their
`until <ISO-date>`) or malformed (missing or too-short reason). Reads
`context.suppress.findExpired()`. Fingerprint:
`<targeted ruleId | '*'>#<hash(reason)>`.
