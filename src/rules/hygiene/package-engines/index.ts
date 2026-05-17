/**
 * @fileoverview package-engines rule — requires declared `engines` keys in package.json.
 * Reads package.json from disk; the graph is unused (manifest engine).
 */
import { existsSync, readFileSync } from 'node:fs';
import type { Diagnostic } from '../../../types.js';
import type { Rule, RuleContext } from '../../types.js';
import { manifestPath } from '../support/manifest-path.js';
import { parsePackageJson } from '../support/package-json.js';

/** Options of package-engines. */
interface Options {
  readonly requiredKeys: readonly string[];
}

const DEFAULTS: Options = { requiredKeys: ['node', 'npm'] };

/** Rule: package.json must declare every required `engines` key (§13.3). */
export const packageEngines: Rule = {
  id: 'package-engines',
  pack: 'hygiene',
  engine: 'manifest',
  defaultSeverity: 'error',
  check: (_graph, config, context: RuleContext): Diagnostic[] => {
    const opts: Options = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const path = manifestPath(config, 'package.json');
    if (!existsSync(path)) return [];
    const doc = parsePackageJson(readFileSync(path, 'utf8'));
    const engines = doc.getSection('engines') ?? {};
    const enginesLoc = doc.keyLocation('engines') ?? doc.rootLocation();
    const seen = new Set<string>();
    const out: Diagnostic[] = [];
    for (const key of opts.requiredKeys) {
      if (seen.has(key)) continue;
      seen.add(key);
      if (key in engines) continue;
      const declaredLoc = doc.sectionKeyLocation('engines', key) ?? enginesLoc;
      out.push({
        ruleId: context.ruleId,
        severity: context.severity,
        entity: 'package.json',
        fingerprint: key,
        message: `engines.${key} must be declared`,
        expected: `engines.${key} is set`,
        actual: `engines.${key} is missing`,
        reason: 'an undeclared engine leaves build reproducibility unguaranteed',
        suggestions: [{ action: 'custom', rationale: `add "${key}" to "engines" in package.json` }],
        location: { ...declaredLoc, file: path },
      });
    }
    return out;
  },
};
