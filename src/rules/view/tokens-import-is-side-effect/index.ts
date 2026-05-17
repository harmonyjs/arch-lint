/**
 * @fileoverview tokens-import-is-side-effect rule — files under tokens/ are imported as
 * side-effects only. Reads AST from the RuleContext project (decision D9).
 */

import type { Diagnostic } from '../../../types.js';
import { dedupByFingerprint } from '../../syntactic-support/dedup.js';
import { type ImportInfo, importsOf } from '../../syntactic-support/import-info.js';
import { segmentsOf } from '../../syntactic-support/segments.js';
import { fileNodeIds, sourceFileFor } from '../../syntactic-support/source-files.js';
import type { SyntacticRule } from '../../types.js';

/** The fixed segment name of the design-tokens folder. */
const TOKENS_SEGMENT = 'tokens';

/** Options of tokens-import-is-side-effect. */
export interface TokensImportIsSideEffectOptions {
  readonly allowedImporters: readonly string[];
  readonly requiredForm: 'side-effect';
}

/** True when an import specifier leads into the tokens folder. */
function specifierTargetsTokens(specifier: string): boolean {
  const parts = specifier.split('/').filter((p) => p !== '' && p !== '.' && p !== '..');
  return parts.includes(TOKENS_SEGMENT);
}

/** True when a file is exempt — listed verbatim or as a per-segment prefix. */
function isAllowedImporter(fileId: string, allowed: readonly string[]): boolean {
  const fileSegs = segmentsOf(fileId);
  return allowed.some((entry) => {
    if (entry === fileId) return true;
    const entrySegs = segmentsOf(entry);
    return entrySegs.length < fileSegs.length && entrySegs.every((s, i) => fileSegs[i] === s);
  });
}

/** Builds the diagnostic for one non-side-effect tokens import. */
function tokensDiagnostic(
  fileId: string,
  imp: ImportInfo,
  ruleId: string,
  severity: Diagnostic['severity'],
): Diagnostic {
  return {
    ruleId,
    severity,
    entity: fileId,
    fingerprint: `${fileId}#${imp.specifier}`,
    message: `Tokens import '${imp.specifier}' must be a side-effect import`,
    actual: `import { … } from '${imp.specifier}'`,
    expected: `import '${imp.specifier}'`,
    reason: 'Design tokens are applied as global side-effects, not consumed as values',
    suggestions: [
      {
        action: 'custom',
        rationale: `Replace with a side-effect import: import '${imp.specifier}'`,
      },
    ],
    location: imp.location,
  };
}

/** Rule: tokens/* is imported as a side-effect only; allowedImporters are exempt. */
export const tokensImportIsSideEffect: SyntacticRule<TokensImportIsSideEffectOptions> = {
  id: 'tokens-import-is-side-effect',
  pack: 'view',
  engine: 'syntactic',
  defaultSeverity: 'warning',
  check: (graph, _config, context): Diagnostic[] => {
    const { allowedImporters } = context.options;
    const diagnostics: Diagnostic[] = [];
    for (const fileId of fileNodeIds(graph)) {
      if (isAllowedImporter(fileId, allowedImporters)) continue;
      const sf = sourceFileFor(context.project, fileId);
      if (sf === undefined) continue;
      for (const imp of importsOf(sf)) {
        if (imp.kind !== 'import' || !specifierTargetsTokens(imp.specifier)) continue;
        if (imp.sideEffectOnly) continue;
        diagnostics.push(tokensDiagnostic(fileId, imp, context.ruleId, context.severity));
      }
    }
    return dedupByFingerprint(diagnostics);
  },
};
