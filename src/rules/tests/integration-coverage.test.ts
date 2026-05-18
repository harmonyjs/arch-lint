/**
 * @fileoverview Meta-coverage test — fails when any built-in rule lacks a
 * per-rule integration test, or when an integration test names no real rule.
 * The durable guarantee that the integration suite never falls behind allRules.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allRules } from '#rules/index.js';

const rulesDir = fileURLToPath(new URL('..', import.meta.url));

/** Every `<pack>/<rule>/tests/integration.test.ts` under src/rules, by id in its describe title. */
function coveredRuleIds(): Set<string> {
  const covered = new Set<string>();
  const entries = readdirSync(rulesDir, { recursive: true, encoding: 'utf8' });
  for (const rel of entries) {
    const posix = rel.split('\\').join('/');
    if (!posix.endsWith('/tests/integration.test.ts')) continue;
    const text = readFileSync(join(rulesDir, rel), 'utf8');
    const match = text.match(/describe\(\s*['"]([a-z0-9-]+) — integration['"]/);
    if (match?.[1] !== undefined) covered.add(match[1]);
  }
  return covered;
}

describe('integration-test coverage', () => {
  const covered = coveredRuleIds();
  const ruleIds = new Set(allRules.map((rule) => rule.id));

  it('every built-in rule has an integration test', () => {
    const uncovered = [...ruleIds].filter((id) => !covered.has(id)).sort();
    expect(uncovered).toEqual([]);
  });

  it('every integration test names a real rule', () => {
    const orphans = [...covered].filter((id) => !ruleIds.has(id)).sort();
    expect(orphans).toEqual([]);
  });
});
