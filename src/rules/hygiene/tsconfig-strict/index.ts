/**
 * @fileoverview tsconfig-strict rule — requires a strict effective compilerOptions
 * (D7 presets). Reads the parsed tsconfig from the manifest bundle; the graph is unused.
 */

import type { Diagnostic } from '#foundation/types/index.js';
import type { ManifestRule, ManifestRuleContext } from '#platform/engine/types.js';

/** Options of tsconfig-strict (D7). */
interface Options {
  readonly preset: 'strictest' | 'strict' | 'recommended';
  readonly additionalFlags: readonly string[];
  readonly ignoreFlags: readonly string[];
}

const RECOMMENDED = ['strict'];
const STRICT = [...RECOMMENDED, 'noUncheckedIndexedAccess', 'noImplicitOverride'];
const STRICTEST = [
  ...STRICT,
  'noImplicitReturns',
  'noFallthroughCasesInSwitch',
  'exactOptionalPropertyTypes',
  'noPropertyAccessFromIndexSignature',
];

/** Returns the required flag set for a preset. */
function presetFlags(preset: Options['preset']): readonly string[] {
  if (preset === 'strictest') return STRICTEST;
  if (preset === 'strict') return STRICT;
  return RECOMMENDED;
}

/** Rule: the effective compilerOptions must carry no strictness relaxation (§13.3, D7). */
export const tsconfigStrict: ManifestRule = {
  id: 'tsconfig-strict',
  pack: 'hygiene',
  engine: 'manifest',
  defaultSeverity: 'error',
  check: (context: ManifestRuleContext): Diagnostic[] => {
    const opts: Options = {
      preset: 'strictest',
      additionalFlags: [],
      ignoreFlags: [],
      ...(context.options as Partial<Options>),
    };
    const eff = context.manifests.tsconfig;
    if (eff === null) return [];
    const ignore = new Set(opts.ignoreFlags);
    const required = [...new Set([...presetFlags(opts.preset), ...opts.additionalFlags])].filter(
      (flag) => !ignore.has(flag),
    );
    const out: Diagnostic[] = [];
    for (const flag of required) {
      if (eff.getOption(flag) === true) continue;
      out.push({
        ruleId: context.ruleId,
        severity: context.severity,
        entity: 'tsconfig.json',
        fingerprint: flag,
        message: `compilerOptions.${flag} must be enabled`,
        expected: `${flag}: true`,
        actual: eff.getOption(flag) === false ? `${flag}: false` : `${flag} is not set`,
        reason: 'relaxing type strictness undermines the architectural guarantees',
        suggestions: [{ action: 'custom', rationale: `enable "${flag}": true in tsconfig.json` }],
        location: { ...eff.keyLocation(flag), file: 'tsconfig.json' },
      });
    }
    return out;
  },
};
