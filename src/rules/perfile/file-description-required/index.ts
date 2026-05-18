/**
 * @fileoverview file-description-required rule — every file must open with a leading
 * @fileoverview JSDoc block. Reads file AST from the RuleContext project (decision D9).
 */

import type { SourceFile } from 'ts-morph';
import { type Node, SyntaxKind } from 'ts-morph';
import type { Diagnostic } from '#foundation/types/index.js';
import { fileNodeIds, sourceFileFor } from '#platform/ast/find-source-file.js';
import type { SyntacticRule, SyntacticRuleContext } from '#platform/engine/types.js';

/** Options of file-description-required. */
interface Options {
  readonly tag: string;
  readonly minLength: number;
}

const DEFAULTS: Options = { tag: '@fileoverview', minLength: 12 };

/** True when the node is a comment node — its own text is the leading comment. */
function isCommentNode(node: Node): boolean {
  const kind = node.getKind();
  return kind === SyntaxKind.SingleLineCommentTrivia || kind === SyntaxKind.MultiLineCommentTrivia;
}

/** Extracts the description that follows the tag, stripping JSDoc decoration. */
function descriptionAfterTag(text: string, tag: string): string {
  const afterTag = text.slice(text.indexOf(tag) + tag.length);
  return afterTag
    .replace(/\*\/\s*$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, ''))
    .join(' ')
    .trim();
}

/** Checks a file's leading JSDoc block; returns a failure reason or null. */
function checkFile(sf: SourceFile, opts: Options): string | null {
  const first = sf.getStatementsWithComments()[0];
  if (first === undefined) return 'file does not open with a JSDoc block /** */';
  // ImportDeclaration is not a JSDocable node in ts-morph, so the leading
  // /** */ block is read from the raw comment range rather than getJsDocs().
  const leadingText = isCommentNode(first)
    ? first.getText()
    : first.getLeadingCommentRanges()[0]?.getText();
  if (leadingText === undefined || !leadingText.startsWith('/**')) {
    return 'file does not open with a JSDoc block /** */';
  }
  if (!leadingText.includes('\n')) {
    return 'the file description must be a multiline JSDoc block';
  }
  if (!leadingText.includes(opts.tag)) return `the JSDoc block has no ${opts.tag} tag`;
  const description = descriptionAfterTag(leadingText, opts.tag);
  if (opts.minLength > 0 && description.length < opts.minLength) {
    return `the ${opts.tag} description is shorter than ${opts.minLength} characters`;
  }
  return null;
}

/** Rule: every file opens with a leading multiline @fileoverview JSDoc block (§13.1). */
export const fileDescriptionRequired: SyntacticRule = {
  id: 'file-description-required',
  pack: 'perfile',
  engine: 'syntactic',
  defaultSeverity: 'error',
  check: (graph, _config, context: SyntacticRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const out: Diagnostic[] = [];
    for (const fileId of fileNodeIds(graph)) {
      const sf = sourceFileFor(context.project, fileId);
      if (sf === undefined) continue;
      const reason = checkFile(sf, opts);
      if (reason === null) continue;
      out.push({
        ruleId: context.ruleId,
        severity: context.severity,
        entity: fileId,
        fingerprint: fileId,
        message: 'file needs a leading JSDoc block with a description',
        actual: reason,
        reason,
        suggestions: [
          { action: 'custom', rationale: `add a leading /** ${opts.tag} … */ block to the file` },
        ],
        location: { file: fileId, line: 1, column: 1 },
      });
    }
    return out;
  },
};
