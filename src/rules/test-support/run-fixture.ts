/**
 * @fileoverview runRuleOnFixture — builds the real graph for a fixture project
 * and runs the check() pipeline filtered to a single rule. The shared backbone
 * of every per-rule integration test: it exercises the rule registry, pack
 * gating and engine dispatch, so a test proves wiring as well as rule logic.
 * Lives in test-support/ (arch-lint.config.ts `ignore`d), so its upward
 * `#runner` import is exempt from self-lint.
 */
import { resolve } from 'node:path';
import { resolveConfig } from '#foundation/config/index.js';
import type { Config } from '#foundation/config/types.js';
import { NullLogger, NullTelemetry } from '#foundation/logger/index.js';
import { buildSuppressIndex } from '#foundation/suppress/suppress-index.js';
import type { Diagnostic } from '#foundation/types/index.js';
import { loadSourceFiles } from '#platform/graph/discover-source-files.js';
import { buildGraphFromSources, graphEntityResolver } from '#platform/graph/index.js';
import { allRules } from '#rules/index.js';
import { check } from '#runner/index.js';

/** A single per-rule fixture run. */
export interface FixtureRun {
  /** Absolute path to the fixture root — holds tsconfig.json and the sources. */
  readonly fixtureRoot: string;
  /** The rule under test; check() is filtered to this id alone. */
  readonly ruleId: string;
  /** Config beyond project paths — layers, units, rule options/severity. */
  readonly config?: Omit<Config, 'project'>;
}

/** Builds the real graph for `fixtureRoot` and runs check() filtered to `ruleId`. */
export async function runRuleOnFixture(run: FixtureRun): Promise<readonly Diagnostic[]> {
  const rule = allRules.find((r) => r.id === run.ruleId);
  if (rule === undefined) {
    throw new Error(`runRuleOnFixture: unknown ruleId '${run.ruleId}' — not in allRules`);
  }
  const { packs: extraPacks, ...rest } = run.config ?? {};
  const config = resolveConfig({
    project: {
      tsconfig: resolve(run.fixtureRoot, 'tsconfig.json'),
      sourceRoot: 'src',
      cwd: run.fixtureRoot,
    },
    packs: [...new Set([...(extraPacks ?? []), rule.pack])],
    ...rest,
  });
  const sources = await loadSourceFiles(config);
  const graph = buildGraphFromSources(config, sources);
  const suppress = buildSuppressIndex(sources.project, config.suppress, graphEntityResolver(graph));
  return check(
    {
      graph,
      config,
      suppress,
      project: sources.project,
      census: sources.census,
      logger: new NullLogger(),
      telemetry: new NullTelemetry(),
    },
    [run.ruleId],
    null,
  ).diagnostics;
}
