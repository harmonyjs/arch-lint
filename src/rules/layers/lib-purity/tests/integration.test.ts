/**
 * @fileoverview Integration test for lib-purity — full check() pipeline over a fixture.
 *
 * KNOWN RULE BUG (reported as DONE_WITH_CONCERNS): lib-purity resolves source
 * files with `context.project.getSourceFile(id)` (index.ts:103), which only
 * matches an in-memory test project keyed by graph node id. On a real cold-build
 * project — keyed by absolute path — that lookup returns `undefined`, so the rule
 * emits zero diagnostics and is effectively dead in production. Its unit tests
 * stay green only because they seed `project.createSourceFile('src/lib/util.ts')`.
 *
 * Every other syntactic rule (no-wildcard-reexport, no-default-export,
 * no-upward-relative-import, ...) uses the D9 bridge `sourceFileFor(project, id)`
 * from #platform/ast/find-source-file.js, which suffix-matches the relative graph
 * id against absolute project paths. lib-purity is the lone exception.
 *
 * The assertions below describe the CORRECT behaviour. The test is marked
 * `it.fails`: it stays green while the bug exists and flips RED the moment the
 * rule is fixed — at which point `.fails` should be dropped. This is the
 * canary for the unit-green / production-dead gap, identical in spirit to the
 * layer-boundary integration test.
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/forbidden-import', import.meta.url));

describe('lib-purity — integration', () => {
  it.fails('flags a lib file importing a forbidden module', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'lib-purity',
      config: { rules: { 'lib-purity': { forbiddenImports: ['react'] } } },
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.entity).toBe('src/lib/util.ts');
    expect(diags[0]?.fingerprint).toBe('src/lib/util.ts#react#useState');
  });
});
