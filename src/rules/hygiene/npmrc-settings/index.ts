/**
 * @fileoverview npmrc-settings rule — requires declared key-value pairs in .npmrc.
 * Reads .npmrc from disk; the graph is unused (manifest engine).
 */
import { existsSync, readFileSync } from 'node:fs';
import type { Diagnostic, Rule, RuleContext } from '../../../types.js';
import { manifestPath } from '../support/manifest-path.js';
import { parseNpmrc } from '../support/npmrc.js';

/** Options of npmrc-settings. */
interface Options {
  readonly required: Readonly<Record<string, string | boolean>>;
}

const DEFAULTS: Options = { required: { 'engine-strict': true, 'save-exact': true } };

/** Rule: .npmrc must declare every required key with the expected value (§13.3). */
export const npmrcSettings: Rule = {
  id: 'npmrc-settings',
  pack: 'hygiene',
  engine: 'manifest',
  defaultSeverity: 'error',
  check: (_graph, config, context: RuleContext): Diagnostic[] => {
    const opts: Options = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const path = manifestPath(config, '.npmrc');
    const doc = parseNpmrc(existsSync(path) ? readFileSync(path, 'utf8') : '');
    const seen = new Set<string>();
    const out: Diagnostic[] = [];
    for (const [key, want] of Object.entries(opts.required)) {
      if (seen.has(key)) continue;
      seen.add(key);
      const actual = doc.get(key);
      const expected = String(want);
      if (actual === expected) continue;
      const loc = doc.keyLocation(key) ?? doc.rootLocation();
      out.push({
        ruleId: context.ruleId,
        severity: context.severity,
        entity: '.npmrc',
        fingerprint: key,
        message: `.npmrc must set ${key}=${expected}`,
        expected: `${key}=${expected}`,
        actual: actual === null ? `${key} is not set` : `${key}=${actual}`,
        reason: 'a non-strict .npmrc allows a non-reproducible install',
        suggestions: [{ action: 'custom', rationale: `add "${key}=${expected}" to .npmrc` }],
        location: { ...loc, file: path },
      });
    }
    return out;
  },
};
