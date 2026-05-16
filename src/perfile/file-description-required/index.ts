/**
 * @fileoverview file-description-required rule — every file must open with a leading
 * @fileoverview JSDoc block. Reads file AST from the RuleContext project (decision D9).
 */
import { Node } from 'ts-morph';
import type { SourceFile } from 'ts-morph';
import type { Diagnostic, Rule, RuleContext } from '../../types.js';
import { fileNodeIds, sourceFileFor } from '../../rules/syntactic-support/source-files.js';

/** Options of file-description-required. */
interface Options {
  readonly tag: string;
  readonly minLength: number;
}

const DEFAULTS: Options = { tag: '@fileoverview', minLength: 12 };

/** Checks a file's leading JSDoc block; returns a failure reason or null. */
function checkFile(sf: SourceFile, opts: Options): string | null {
  const first = sf.getStatementsWithComments()[0];
  const jsdoc = first && Node.isJSDocable(first) ? first.getJsDocs()[0] : undefined;
  if (!jsdoc) return 'file does not open with a JSDoc block /** */';
  if (!jsdoc.getText().includes('\n')) {
    return 'the file description must be a multiline JSDoc block';
  }
  const tag = jsdoc.getTags().find((t) => `@${t.getTagName()}` === opts.tag);
  if (!tag) return `the JSDoc block has no ${opts.tag} tag`;
  const comment = (tag.getCommentText() ?? '').trim();
  if (opts.minLength > 0 && comment.length < opts.minLength) {
    return `the ${opts.tag} description is shorter than ${opts.minLength} characters`;
  }
  return null;
}

/** Rule: every file opens with a leading multiline @fileoverview JSDoc block (§13.1). */
export const fileDescriptionRequired: Rule = {
  id: 'file-description-required',
  pack: 'perfile',
  engine: 'perfile',
  defaultSeverity: 'error',
  check: (graph, _config, context: RuleContext): Diagnostic[] => {
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
