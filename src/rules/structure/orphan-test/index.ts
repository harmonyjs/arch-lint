/**
 * @fileoverview orphan-test rule — flags a `<name>.test.<ext>` file that has no
 * `<name>` source sibling, a test co-located with nothing it tests.
 */

import { baseNameOf, dirOf, stemOf } from '#entity-id.js';
import { isTestFile } from '#rules/structure/support/test-file.js';
import { fileNodeIds } from '#rules/syntactic-support/find-source-file.js';
import type { GraphRule, GraphRuleContext } from '#rules/types.js';
import type { Diagnostic } from '#types.js';

/** Tunable options of the orphan-test rule. */
interface Options {
  /** Directory name orphaned tests belong in — and inside which they are exempt. */
  readonly testFolder: string;
}

const DEFAULTS: Options = { testFolder: 'tests' };

/** Rule: a `*.test.*` file with no same-stem source sibling is an orphaned test. */
export const orphanTest: GraphRule = {
  id: 'orphan-test',
  pack: 'structure',
  engine: 'graph',
  defaultSeverity: 'warning',
  check: (graph, _config, context: GraphRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    // directory → stems of its non-test source files
    const sourceStems = new Map<string, Set<string>>();
    const testFiles: string[] = [];
    for (const fileId of fileNodeIds(graph)) {
      const base = baseNameOf(fileId);
      if (isTestFile(base)) {
        testFiles.push(fileId);
        continue;
      }
      const dir = dirOf(fileId);
      let stems = sourceStems.get(dir);
      if (stems === undefined) {
        stems = new Set();
        sourceStems.set(dir, stems);
      }
      stems.add(stemOf(base));
    }
    const out: Diagnostic[] = [];
    for (const testId of testFiles) {
      if (testId.split('/').includes(opts.testFolder)) continue;
      const dir = dirOf(testId);
      const name = stemOf(baseNameOf(testId));
      if (sourceStems.get(dir)?.has(name)) continue;
      out.push({
        ruleId: context.ruleId,
        severity: context.severity,
        entity: testId,
        fingerprint: `orphan-test#${testId}`,
        message: `test file ${testId} has no local subject`,
        expected: `a ${name} source sibling, or relocation into a ${opts.testFolder}/ folder`,
        actual: testId,
        reason:
          'a test with no local subject is co-located with nothing; it belongs in a dedicated tests directory',
        suggestions: [
          {
            action: 'move',
            target: opts.testFolder,
            rationale: `move the test file into a ${opts.testFolder}/ folder`,
          },
        ],
        location: { file: testId, line: 1, column: 1 },
      });
    }
    return out;
  },
};
