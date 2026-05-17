/**
 * @fileoverview max-lines rule — caps the line count of a file, optionally skipping
 * blank and comment lines. Reads file text from the RuleContext project (decision D9).
 */
import type { SourceFile } from 'ts-morph';
import type { Diagnostic } from '../../../types.js';
import { fileNodeIds, sourceFileFor } from '../../syntactic-support/source-files.js';
import type { SyntacticRule, SyntacticRuleContext } from '../../types.js';

/** Options of max-lines. */
interface Options {
  readonly max: number;
  readonly skipComments: boolean;
  readonly skipBlankLines: boolean;
}

const DEFAULTS: Options = { max: 200, skipComments: true, skipBlankLines: true };

/** The 1-based set of lines fully occupied by a comment. */
function commentLines(rawLines: readonly string[]): Set<number> {
  const lines = new Set<number>();
  let inBlock = false;
  rawLines.forEach((raw, idx) => {
    const trimmed = raw.trim();
    if (inBlock) {
      lines.add(idx + 1);
      if (trimmed.includes('*/')) inBlock = false;
      return;
    }
    if (trimmed.startsWith('//')) {
      lines.add(idx + 1);
      return;
    }
    if (trimmed.startsWith('/*')) {
      lines.add(idx + 1);
      if (!trimmed.includes('*/')) inBlock = true;
    }
  });
  return lines;
}

/** Counts the significant lines of a file under the given options. */
function countLines(sf: SourceFile, opts: Options): number {
  const rawLines = sf.getFullText().replace(/\n$/, '').split('\n');
  const comments = opts.skipComments ? commentLines(rawLines) : new Set<number>();
  let count = 0;
  rawLines.forEach((raw, idx) => {
    if (opts.skipBlankLines && raw.trim() === '') return;
    if (comments.has(idx + 1)) return;
    count += 1;
  });
  return count;
}

/** Rule: a file's line count must not exceed `max` (§13.1). */
export const maxLines: SyntacticRule = {
  id: 'max-lines',
  pack: 'perfile',
  engine: 'syntactic',
  defaultSeverity: 'warning',
  check: (graph, _config, context: SyntacticRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    const out: Diagnostic[] = [];
    for (const fileId of fileNodeIds(graph)) {
      const sf = sourceFileFor(context.project, fileId);
      if (sf === undefined) continue;
      const lines = countLines(sf, opts);
      if (lines <= opts.max) continue;
      out.push({
        ruleId: context.ruleId,
        severity: context.severity,
        entity: fileId,
        fingerprint: fileId,
        message: `the file is longer than ${opts.max} lines`,
        expected: `≤ ${opts.max} lines`,
        actual: `${lines} lines`,
        reason: 'a large file signals poor decomposition of the entity',
        suggestions: [{ action: 'split', rationale: 'split the file into smaller entities' }],
        location: { file: fileId, line: 1, column: 1 },
      });
    }
    return out;
  },
};
