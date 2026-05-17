/**
 * @fileoverview Zod schema for the arch-lint user config. It validates the
 * config structure and per-rule option shapes, then yields a typed Config.
 * Validation errors carry the offending path inside the config; an invalid
 * config maps to process exit code 2 (spec §3). validateConfig wraps the schema
 * and raises a path-aware ConfigError on failure.
 */
import { z } from 'zod';
import { ConfigError } from '../errors.js';
import type { Config } from './types.js';

/** Severity enum — the four allowed rule severities. */
const severitySchema = z.enum(['off', 'info', 'warning', 'error']);

/** Pack enum — the seven rule packs. */
const packSchema = z.enum(['layers', 'barrels', 'placement', 'perfile', 'hygiene', 'view', 'meta']);

/**
 * A rule setting: a bare severity string OR an object { severity?, ...options }.
 * Not a discriminated union — the object branch has no tag field. Unknown
 * option keys pass through (looseObject) so plugins and future options do not
 * fail validation; known per-rule option shapes are checked at resolve time.
 */
export const ruleSettingSchema = z.union([
  severitySchema,
  z.looseObject({ severity: severitySchema.optional() }),
]);

/** project block — tsconfig required, the rest optional. */
const projectSchema = z.object({
  tsconfig: z.string(),
  sourceRoot: z.string().optional(),
  cwd: z.string().optional(),
  includeOutOfRoot: z.boolean().optional(),
  rootAlias: z.string().optional(),
});

/** conventions block — role-folder names; every field optional. */
const conventionsSchema = z
  .object({
    privateSegment: z.string(),
    sharedSegment: z.string(),
    libSegment: z.string(),
    hooksSegment: z.string(),
    explicitClusterSegment: z.string(),
    modelSegment: z.string(),
    indexFiles: z.array(z.string()),
  })
  .partial();

/** A single layer: canImport list, optional sideEffectOnly subset. */
const layerSchema = z.object({
  canImport: z.array(z.string()),
  sideEffectOnly: z.array(z.string()).optional(),
});

/** layers block — keyed by path-segment prefix or file path. */
const layersSchema = z.record(z.string(), layerSchema);

/** resolve block — import-resolver knobs; every field optional. */
const resolveSchema = z
  .object({
    treatTypeOnlyAsEdge: z.boolean(),
    maxResolveDepth: z.number(),
    cacheSize: z.number(),
    extensions: z.array(z.string()),
  })
  .partial();

/** A single explicit-placement rule. */
const explicitPlacementSchema = z.object({
  path: z.string(),
  cluster: z.string(),
  excludeRules: z.array(z.string()).optional(),
});

/** baseline block — every field optional. */
const baselineSchema = z
  .object({
    file: z.string(),
    sortRecords: z.literal('alphabetical'),
    missingBehavior: z.enum(['error', 'ignore']),
  })
  .partial();

/** suppress block — every field optional. */
const suppressSchema = z
  .object({
    marker: z.string(),
    minReasonLength: z.number(),
    expirySupport: z.boolean(),
    scanLocations: z.array(z.enum(['leading-comment', 'jsdoc'])),
    maxDistanceLines: z.number(),
  })
  .partial();

/** report.cli block — every field optional. */
const reportCliSchema = z
  .object({
    color: z.enum(['auto', 'always', 'never']),
    showSuggestions: z.boolean(),
    showConsumers: z.boolean(),
    hyperlinks: z.enum(['auto', 'always', 'never']),
    foldLongLists: z.boolean(),
  })
  .partial();

/** runMode block — three per-mode sub-blocks, each fully optional. */
const runModeSchema = z
  .object({
    watch: z
      .object({
        rules: z.union([z.literal('all'), z.array(z.string())]),
        debounceMs: z.number(),
        clearOnRerun: z.boolean(),
      })
      .partial(),
    preCommit: z
      .object({
        rules: z.union([z.literal('all'), z.array(z.string())]),
        maxDurationMs: z.number(),
        failOnViolations: z.boolean(),
      })
      .partial(),
    ci: z.object({ failOnViolations: z.boolean() }).partial(),
  })
  .partial();

/**
 * A plugin Rule object. The check function is the only deeply-typed member;
 * runtime validation stays shallow because a Rule is code, not data.
 */
const pluginRuleSchema = z.object({
  id: z.string(),
  pack: packSchema,
  engine: z.enum(['graph', 'syntactic', 'manifest']),
  defaultSeverity: z.enum(['info', 'warning', 'error']),
  check: z.custom<(...args: never[]) => unknown>((value) => typeof value === 'function'),
});

/**
 * The full arch-lint config schema. rules and perFileRules are records keyed by
 * rule id (plugin ids allowed) — keys are not fixed by the schema; each value is
 * a ruleSettingSchema covering the per-rule options of all 27 rules.
 */
export const configSchema = z.object({
  project: projectSchema,
  conventions: conventionsSchema.optional(),
  packs: z.array(packSchema).optional(),
  explicitPlacement: z.array(explicitPlacementSchema).optional(),
  resolve: resolveSchema.optional(),
  layers: layersSchema.optional(),
  rules: z.record(z.string(), ruleSettingSchema).optional(),
  perFileRules: z.record(z.string(), ruleSettingSchema).optional(),
  ignore: z.array(z.string()).optional(),
  baseline: baselineSchema.optional(),
  suppress: suppressSchema.optional(),
  report: z.object({ cli: reportCliSchema.optional() }).optional(),
  runMode: runModeSchema.optional(),
  plugins: z.array(pluginRuleSchema).optional(),
});

/**
 * Validates a raw config object against the schema. On success returns the
 * typed Config; on failure throws a ConfigError whose message names the
 * offending path inside the config (exit code 2 per spec §3).
 */
export function validateConfig(raw: unknown, configPath?: string): Config {
  const result = configSchema.safeParse(raw);
  if (result.success) {
    // Cast through unknown: a plugin Rule is validated shallowly (check is just
    // asserted to be a function), so the inferred shape does not structurally
    // overlap with the deeply-typed Rule of the canonical contract.
    return result.data as unknown as Config;
  }
  const details = result.error.issues
    .map((issue) => {
      const issuePath = issue.path.length > 0 ? issue.path.join('.') : '<root>';
      return `  - ${issuePath}: ${issue.message}`;
    })
    .join('\n');
  const where = configPath !== undefined ? ` in ${configPath}` : '';
  const message = `Invalid arch-lint config${where}:\n${details}`;
  throw new ConfigError(message, configPath !== undefined ? { configPath } : {});
}
