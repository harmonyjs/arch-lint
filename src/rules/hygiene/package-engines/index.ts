/**
 * @fileoverview package-engines rule — requires declared `engines` keys in package.json.
 * Reads the parsed package.json from the manifest bundle; the graph is unused.
 */

import type { ManifestRule, ManifestRuleContext } from '#rules/types.js';
import type { Diagnostic } from '#types.js';

/** Options of package-engines. */
interface Options {
  readonly requiredKeys: readonly string[];
}

const DEFAULTS: Options = { requiredKeys: ['node', 'npm'] };

/** Rule: package.json must declare every required `engines` key (§13.3). */
export const packageEngines: ManifestRule = {
  id: 'package-engines',
  pack: 'hygiene',
  engine: 'manifest',
  defaultSeverity: 'error',
  check: (context: ManifestRuleContext): Diagnostic[] => {
    const opts: Options = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const doc = context.manifests.packageJson;
    if (doc === null) return [];
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
        location: { ...declaredLoc, file: 'package.json' },
      });
    }
    return out;
  },
};
