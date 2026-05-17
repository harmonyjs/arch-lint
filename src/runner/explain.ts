/**
 * @fileoverview The `explain <rule-id>` command — prints a rule's documentation
 * (`docs/rules/<rule-id>.md`) to stdout. It builds no graph and reads no project
 * config. `runExplain` is process-pure: it returns the text and the exit code,
 * leaving the actual printing and `process.exit` to the CLI layer.
 */
import { readFile } from 'node:fs/promises';
import { allRules } from '#rules/index.js';
import { ruleDocPath } from './paths.js';

/** Result of running `explain`: the text to print and the process exit code. */
export interface ExplainOutcome {
  readonly stdout: string;
  readonly exitCode: 0 | 2;
}

/**
 * Resolve the documentation for `ruleId`. Returns exit code 2 with the list of
 * available rules when the id is unknown, or exit code 2 when the doc file
 * exists in the registry but cannot be read.
 */
export async function runExplain(ruleId: string): Promise<ExplainOutcome> {
  const ids = allRules.map((rule) => rule.id).sort();

  if (!ids.includes(ruleId)) {
    const available = ids.map((id) => `  ${id}`).join('\n');
    return {
      stdout: `Unknown rule: ${ruleId}\nAvailable rules:\n${available}`,
      exitCode: 2,
    };
  }

  try {
    const doc = await readFile(ruleDocPath(ruleId), 'utf8');
    return { stdout: doc, exitCode: 0 };
  } catch {
    return {
      stdout: `Documentation for rule "${ruleId}" is not available.`,
      exitCode: 2,
    };
  }
}
