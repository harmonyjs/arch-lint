/**
 * @fileoverview orphan-test rule — flags a `<name>.test.<ext>` file that has no
 * `<name>` source sibling, a test co-located with nothing it tests.
 */

import { baseNameOf, dirOf, dropExtension, isUnderSegment } from '#foundation/entity-id/index.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { CensusRule, CensusRuleContext } from '#platform/engine/types.js';
import { isTestFile } from '#rules/structure/support/test-file.js';

/** Tunable options of the orphan-test rule. */
interface Options {
  /** Directory name orphaned tests belong in — and inside which they are exempt. */
  readonly testFolder: string;
}

const DEFAULTS: Options = { testFolder: 'tests' };

/**
 * The subject name a `<name>.test.<ext>` file claims to cover — the basename
 * text before `.test.`. `widget.test.ts` -> `widget`; `config.test.ts` ->
 * `config`; `index.integration.test.ts` -> `index.integration`. Caller must
 * pass a basename `isTestFile` already accepted, so `.test.` is present.
 */
function testSubjectName(testBase: string): string {
  return testBase.slice(0, testBase.indexOf('.test.'));
}

/** Rule: a `*.test.*` file with no same-stem source sibling is an orphaned test. */
export const orphanTest: CensusRule = {
  id: 'orphan-test',
  pack: 'structure',
  engine: 'census',
  defaultSeverity: 'warning',
  check: (context: CensusRuleContext): Diagnostic[] => {
    const opts = { ...DEFAULTS, ...(context.options as Partial<Options>) };
    // directory → names of its non-test source files (basename minus last extension)
    const sourceNames = new Map<string, Set<string>>();
    const testFiles: string[] = [];
    for (const fileId of context.census) {
      const base = baseNameOf(fileId);
      if (isTestFile(base)) {
        testFiles.push(fileId);
        continue;
      }
      const dir = dirOf(fileId);
      let names = sourceNames.get(dir);
      if (names === undefined) {
        names = new Set();
        sourceNames.set(dir, names);
      }
      names.add(dropExtension(base));
    }
    const out: Diagnostic[] = [];
    for (const testId of testFiles) {
      if (isUnderSegment(testId, opts.testFolder)) continue;
      const dir = dirOf(testId);
      const name = testSubjectName(baseNameOf(testId));
      if (sourceNames.get(dir)?.has(name)) continue;
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
