/**
 * @fileoverview resolveConfig — turns a validated user Config into a fully
 * defaulted, normalized ResolvedConfig. It applies the Appendix B defaults and
 * normalizes every RuleSetting (string or object) into an object form with an
 * explicit severity. This is the single config-resolution step; later
 * milestones read ResolvedConfig as-is and never re-resolve.
 */
import type {
  Config,
  ConventionsConfig,
  Pack,
  ResolveConfig,
  ResolvedConfig,
  ResolvedRuleSetting,
  RuleSetting,
  ViewConfig,
} from './types.js';

/** Framework-agnostic default pack set (Appendix B) — 'view' is opt-in. */
const DEFAULT_PACKS: readonly Pack[] = [
  'layers',
  'barrels',
  'placement',
  'meta',
  'perfile',
  'hygiene',
];

/** Default conventions block (Appendix B). */
const DEFAULT_CONVENTIONS: ConventionsConfig = {
  privateSegment: 'slots',
  sharedSegment: 'items',
  libSegment: 'lib',
  hooksSegment: 'hooks',
  explicitClusterSegment: 'ui',
  modelSegment: 'model',
  indexFiles: ['index.ts', 'index.tsx'],
};

/** Default resolve block (Appendix B). */
const DEFAULT_RESOLVE: ResolveConfig = {
  treatTypeOnlyAsEdge: true,
  maxResolveDepth: 32,
  cacheSize: Infinity,
  extensions: ['.ts', '.tsx'],
};

/** Default view block (#26) — auto-detect the region from JSX placement. */
const DEFAULT_VIEW: ViewConfig = {
  region: 'auto',
};

/**
 * Normalizes one RuleSetting to ResolvedRuleSetting: a bare severity string
 * becomes { severity }; an object is kept and its severity defaulted to
 * 'warning' when absent. Every Appendix B object form already carries severity;
 * the fallback exists only for totality.
 */
function normalizeRuleSetting(setting: RuleSetting): ResolvedRuleSetting {
  if (typeof setting === 'string') {
    return { severity: setting };
  }
  const { severity, ...options } = setting;
  return { severity: severity ?? 'warning', ...options };
}

/** Normalizes a whole rules / perFileRules record. */
function normalizeRules(
  raw: Readonly<Record<string, RuleSetting>> | undefined,
): Readonly<Record<string, ResolvedRuleSetting>> {
  const out: Record<string, ResolvedRuleSetting> = {};
  for (const [id, setting] of Object.entries(raw ?? {})) {
    out[id] = normalizeRuleSetting(setting);
  }
  return out;
}

/** Resolves the project block, carrying rootAlias only when set. */
function resolveProject(project: Config['project']): ResolvedConfig['project'] {
  return {
    tsconfig: project.tsconfig,
    sourceRoot: project.sourceRoot ?? 'src',
    cwd: project.cwd ?? process.cwd(),
    includeOutOfRoot: project.includeOutOfRoot ?? false,
    ...(project.rootAlias !== undefined ? { rootAlias: project.rootAlias } : {}),
  };
}

/** Resolves the runMode block with the Appendix B per-mode defaults. */
function resolveRunMode(runMode: Config['runMode']): ResolvedConfig['runMode'] {
  return {
    watch: {
      rules: runMode?.watch?.rules ?? 'all',
      debounceMs: runMode?.watch?.debounceMs ?? 200,
      clearOnRerun: runMode?.watch?.clearOnRerun ?? true,
    },
    preCommit: {
      rules: runMode?.preCommit?.rules ?? 'all',
      maxDurationMs: runMode?.preCommit?.maxDurationMs ?? 5000,
      failOnViolations: runMode?.preCommit?.failOnViolations ?? true,
    },
    ci: {
      failOnViolations: runMode?.ci?.failOnViolations ?? true,
    },
  };
}

/**
 * Resolves a validated Config into a ResolvedConfig: every Appendix B default
 * applied, every RuleSetting normalized to object form. Also serves the
 * zero-config path — a synthetic { project: { tsconfig } } resolves cleanly.
 */
export function resolveConfig(config: Config): ResolvedConfig {
  return {
    project: resolveProject(config.project),
    conventions: { ...DEFAULT_CONVENTIONS, ...config.conventions },
    view: { ...DEFAULT_VIEW, ...config.view },
    packs: config.packs ?? DEFAULT_PACKS,
    explicitPlacement: config.explicitPlacement ?? [],
    resolve: { ...DEFAULT_RESOLVE, ...config.resolve },
    layers: config.layers ?? {},
    rules: normalizeRules(config.rules),
    perFileRules: normalizeRules(config.perFileRules),
    ignore: config.ignore ?? [],
    baseline: {
      file: config.baseline?.file ?? '.arch-lint-baseline.json',
      sortRecords: config.baseline?.sortRecords ?? 'alphabetical',
      missingBehavior: config.baseline?.missingBehavior ?? 'error',
    },
    suppress: {
      marker: config.suppress?.marker ?? '@arch-decision',
      minReasonLength: config.suppress?.minReasonLength ?? 12,
      expirySupport: config.suppress?.expirySupport ?? true,
      scanLocations: config.suppress?.scanLocations ?? ['leading-comment', 'jsdoc'],
      maxDistanceLines: config.suppress?.maxDistanceLines ?? 5,
    },
    report: {
      cli: {
        color: config.report?.cli?.color ?? 'auto',
        showSuggestions: config.report?.cli?.showSuggestions ?? true,
        showConsumers: config.report?.cli?.showConsumers ?? true,
        hyperlinks: config.report?.cli?.hyperlinks ?? 'auto',
        foldLongLists: config.report?.cli?.foldLongLists ?? true,
      },
    },
    runMode: resolveRunMode(config.runMode),
    plugins: config.plugins ?? [],
  };
}
