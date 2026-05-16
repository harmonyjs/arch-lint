# ui-cluster-membership

Pack `view` · engine `syntactic` · default `error`.

A file importing a package from `triggerPackages` must live under the cluster
path `mustLiveIn`. The view pack is parametrized by config — `triggerPackages`
are glob patterns (`@react-aria/*`); Preact or any other library substitutes
its own packages, no hardcoded React.

Options: `triggerPackages` — glob patterns of trigger packages; `mustLiveIn` —
the UI cluster path.

Single-occurrence — one verdict per file, no fingerprint. The suggestion
recommends extracting the primitive into the cluster, keeping a thin wrapper
(inherited from the removed `extract-primitive-candidate` rule).
