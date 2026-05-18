/**
 * @fileoverview tokens-import-is-side-effect rule — files under tokens/ are imported as
 * side-effects only. Reads AST from the RuleContext project (decision D9).
 */

import type { SourceFile } from 'ts-morph';
import { isAtOrUnderPrefix } from '#foundation/entity-id/index.js';
import type { Diagnostic } from '#foundation/types/index.js';
import { sourceFileFor } from '#platform/ast/find-source-file.js';
import { type ImportInfo, importsOf } from '#platform/ast/import-info.js';
import { dedupByFingerprint } from '#platform/engine/dedup-diagnostics.js';
import type { SyntacticRule, SyntacticRuleContext } from '#platform/engine/types.js';

/** The fixed segment name of the design-tokens folder. */
const TOKENS_SEGMENT = 'tokens';

/** Options of tokens-import-is-side-effect. */
export interface TokensImportIsSideEffectOptions {
  readonly allowedImporters: readonly string[];
  readonly requiredForm: 'side-effect';
}

/** Default options — the lenient defaults applied when the config omits per-rule options. */
const DEFAULTS: TokensImportIsSideEffectOptions = {
  allowedImporters: [],
  requiredForm: 'side-effect',
};

/** True when an import specifier leads into the tokens folder. */
function specifierTargetsTokens(specifier: string): boolean {
  const parts = specifier.split('/').filter((p) => p !== '' && p !== '.' && p !== '..');
  return parts.includes(TOKENS_SEGMENT);
}

/** True when a file is exempt — listed verbatim or as a per-segment prefix at-or-above it. */
function isAllowedImporter(fileId: string, allowed: readonly string[]): boolean {
  return allowed.some((entry) => isAtOrUnderPrefix(fileId, entry));
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

/** Collects the non-side-effect tokens imports of one file into `diagnostics`. */
function collectFileDiagnostics(
  fileId: string,
  sf: SourceFile,
  context: SyntacticRuleContext<TokensImportIsSideEffectOptions>,
  diagnostics: Diagnostic[],
): void {
  for (const imp of importsOf(sf)) {
    if (imp.kind !== 'import' || !specifierTargetsTokens(imp.specifier)) continue;
    if (imp.sideEffectOnly) continue;
    diagnostics.push(tokensDiagnostic(fileId, imp, context.ruleId, context.severity));
  }
}

/** Rule: tokens/* is imported as a side-effect only; allowedImporters are exempt. */
export const tokensImportIsSideEffect: SyntacticRule<TokensImportIsSideEffectOptions> = {
  id: 'tokens-import-is-side-effect',
  pack: 'view',
  engine: 'syntactic',
  defaultSeverity: 'warning',
  check: (graph, _config, context): Diagnostic[] => {
    const { allowedImporters } = {
      ...DEFAULTS,
      ...(context.options as Partial<TokensImportIsSideEffectOptions>),
    };
    const diagnostics: Diagnostic[] = [];
    for (const node of graph.nodes.values()) {
      if (node.kind !== 'file' || node.region !== 'view') continue;
      if (isAllowedImporter(node.id, allowedImporters)) continue;
      const sf = sourceFileFor(context.project, node.id);
      if (sf === undefined) continue;
      collectFileDiagnostics(node.id, sf, context, diagnostics);
    }
    return dedupByFingerprint(diagnostics);
  },
};
