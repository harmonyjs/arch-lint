# Part 1 — type inventory

`src/types.ts` exported types → owning subsystem → importing subsystems.
"core/thin" = stays in src/types.ts (cross-cutting: imported by ≥2 independent subsystems).

| Type | Owner | Importing subsystems |
|------|-------|----------------------|
| Diagnostic        | core/thin       | baseline, report, rules, runner, suppress |
| Severity          | core/thin       | config, rules |
| ActiveSeverity    | core/thin       | report, rules (also internal to Diagnostic/CheckResult) |
| Location          | core/thin       | baseline, graph, rules, suppress |
| ProjectConfig     | config          | config (Config), public-api |
| ConventionsConfig | config          | config, graph, rules |
| ExplicitPlacementRule | config      | config (Config), graph |
| ResolveConfig     | config          | config, public-api |
| LayerConfig       | config          | config (LayersConfig), public-api |
| LayersConfig      | config          | config, rules |
| BaselineConfig    | config          | config, public-api |
| SuppressConfig    | config          | config, suppress |
| ReportCliConfig   | config          | config, public-api |
| ReportConfig      | config          | config, public-api |
| WatchRunMode      | config          | config, public-api |
| PreCommitRunMode  | config          | config, public-api |
| CiRunMode         | config          | config, public-api |
| RunModeConfig     | config          | config, public-api |
| Pack              | config          | config, rules, public-api |
| RuleSetting       | config          | config, rules, public-api |
| RuleSettingObject | config          | config, public-api |
| ResolvedRuleSetting | config        | config, public-api |
| Config            | config          | config, errors, public-api |
| ResolvedConfig    | config          | config, graph, report, rules, runner |
| Node              | graph           | graph, rules |
| Edge              | graph           | graph, rules, runner |
| UnresolvedReason  | graph           | graph (Resolution/UnresolvedImport), public-api |
| UnresolvedImport  | graph           | graph, rules |
| Resolution        | graph           | graph (internal; NOT in public-api) |
| ConsumerGraph     | graph           | graph, rules, runner |
| Rule              | rules           | config (Config.plugins), rules |
| RuleContext       | rules           | rules |
| RuleEngine        | rules           | rules (internal to Rule), public-api |
| ConsumerInfo      | rules           | rules (Diagnostic), report |
| Suggestion        | rules           | rules (Diagnostic), public-api |
| CheckResult       | rules           | report, rules/engine, runner |
| ParsedSuppress    | suppress        | rules, suppress |
| SuppressIndex     | suppress        | rules, suppress |
| BaselineRecord    | baseline        | baseline, public-api |
| BaselineFile      | baseline        | baseline, rules/engine, public-api |

## Decision notes

- `Diagnostic`, `Severity`, `ActiveSeverity`, `Location` are the thin core set — each is
  imported by ≥2 independent subsystems. `Diagnostic` structurally embeds `ActiveSeverity`,
  `Location`, `ConsumerInfo`, `Suggestion`; `ConsumerInfo`/`Suggestion` move to
  `rules/types.ts` and `src/types.ts` imports them back (one inward edge core→rules —
  acceptable).
- `ConventionsConfig`, `ExplicitPlacementRule`, `LayersConfig`, `Pack`, `SuppressConfig`,
  `RuleSetting` are config-owned even though graph/rules/suppress consume them.
- `CheckResult` is rules-owned (`runEngine` produces it); `report` and the runner consume it.
- `Resolution` is graph-internal and is NOT re-exported by `public-api.ts`.
- `Rule`/`RuleContext` move AS-IS into `rules/types.ts`; do not change shape here.
