/**
 * @fileoverview exact-dependency-versions rule — requires exact dependency versions
 * (no range operators, no dist-tags). Reads the parsed package.json from the manifest bundle.
 */

import type { ManifestRule, ManifestRuleContext } from '#rules/types.js';
import type { Diagnostic } from '#types.js';

/** Options of exact-dependency-versions. */
interface Options {
  readonly sections: readonly string[];
}

const DEFAULTS: Options = { sections: ['dependencies', 'devDependencies'] };
const FORBIDDEN_SECTIONS = new Set(['peerDependencies', 'optionalDependencies']);
const EXACT_SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/;
const SKIP_PROTOCOL = /^(?:workspace:|file:|link:|npm:|git\+|github:|https?:)/;

/** True when `spec` is an exact semver — no range operators and no dist-tag. */
function isExact(spec: string): boolean {
  if (SKIP_PROTOCOL.test(spec)) return true; // not an npm range — not our concern
  return EXACT_SEMVER.test(spec.trim());
}

/** Rule: dependency sections must pin exact versions (§13.3). */
export const exactDependencyVersions: ManifestRule = {
  id: 'exact-dependency-versions',
  pack: 'hygiene',
  engine: 'manifest',
  defaultSeverity: 'error',
  check: (context: ManifestRuleContext): Diagnostic[] => {
    const opts: Options = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const doc = context.manifests.packageJson;
    if (doc === null) return [];
    const sections = opts.sections.filter((s) => !FORBIDDEN_SECTIONS.has(s));
    const out: Diagnostic[] = [];
    for (const section of sections) {
      const deps = doc.getSection(section);
      if (!deps) continue;
      for (const [pkg, spec] of Object.entries(deps)) {
        if (isExact(spec)) continue;
        const fingerprint = `${section}#${pkg}`;
        const loc = doc.sectionKeyLocation(section, pkg) ?? doc.rootLocation();
        out.push({
          ruleId: context.ruleId,
          severity: context.severity,
          entity: 'package.json',
          fingerprint,
          message: `${section}.${pkg} must be an exact version`,
          expected: 'exact version (1.2.3)',
          actual: `"${spec}"`,
          reason: 'range versions make the build non-reproducible across installs',
          suggestions: [{ action: 'custom', rationale: `pin "${pkg}" to an exact version` }],
          location: { ...loc, file: 'package.json' },
        });
      }
    }
    return out;
  },
};
