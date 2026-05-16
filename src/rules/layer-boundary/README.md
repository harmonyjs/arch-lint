# layer-boundary

Pack `layers` · engine `structural` · default `error`.

A file in one layer may import a file in another layer only if the producer
layer is listed in the consumer layer's `canImport`. One diagnostic per
`(consumer file, forbidden producer file)` pair. `sideEffectOnly` targets may be
imported with no bindings only. Fingerprint: `<consumer file>#<producer file>`.
