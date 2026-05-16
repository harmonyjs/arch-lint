/**
 * @fileoverview runEngine — executes the §8.1 rule pipeline over a frozen graph.
 */
import type { Project } from 'ts-morph';
import { classifyDiagnostics } from '../baseline/classify.js';
import type {
  ActiveSeverity,
  BaselineFile,
  CheckResult,
  ConsumerGraph,
  Diagnostic,
  ResolvedConfig,
  SuppressIndex,
} from '../types.js';
import { buildRuleContext } from './build-context.js';
import { dedupPlacement } from './dedup-placement.js';
import { getActiveRules } from './index.js';
import { runtimeSelfCheck } from './self-check.js';

/** Tally classified diagnostics into the CheckResult summary and exit code (§10.3). */
function buildResult(diagnostics: readonly Diagnostic[]): CheckResult {
  const bySeverity: Record<ActiveSeverity, number> = { info: 0, warning: 0, error: 0 };
  let newCount = 0;
  let inBaseline = 0;
  let blockingNew = false;
  for (const d of diagnostics) {
    bySeverity[d.severity] += 1;
    if (d.status === 'inBaseline') {
      inBaseline += 1;
    } else {
      newCount += 1;
      if (d.severity !== 'info') blockingNew = true;
    }
  }
  return {
    diagnostics,
    summary: { total: diagnostics.length, bySeverity, new: newCount, inBaseline },
    exitCode: blockingNew ? 1 : 0,
  };
}

/**
 * Run the §8.1 pipeline over a frozen graph: collect rule diagnostics (each rule sees
 * `project` per D9), drop suppressed ones, dedup placement verdicts, run the §10.2
 * self-check, then classify against the baseline. Free of file I/O — `suppress`,
 * `project` and `baseline` are supplied by the runner (M7).
 */
export function runEngine(
  graph: ConsumerGraph,
  config: ResolvedConfig,
  suppress: SuppressIndex,
  project: Project,
  ruleFilter?: readonly string[],
  baseline?: BaselineFile | null,
): CheckResult {
  const activeRules = getActiveRules(config, ruleFilter);
  let diagnostics: Diagnostic[] = activeRules.flatMap((rule) =>
    rule.check(graph, config, buildRuleContext(rule, config, suppress, project)),
  );
  diagnostics = diagnostics.filter((d) => !suppress.isSuppressed(d));
  diagnostics = [...dedupPlacement(diagnostics)];
  runtimeSelfCheck(diagnostics);
  diagnostics = classifyDiagnostics(diagnostics, baseline ?? null);
  return buildResult(diagnostics);
}
