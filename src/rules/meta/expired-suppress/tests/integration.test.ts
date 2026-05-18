/**
 * @fileoverview Integration test for expired-suppress — full check() pipeline over a fixture.
 *
 * KNOWN-FAILING CANARY. The fixture and the @arch-decision syntax are correct: the
 * stale-suppression fixture carries a real, expired suppress directive that
 * `findExpired()` returns once the directive is parsed (verified directly). The
 * integration path is blocked by a foundation bug:
 *
 *   `buildSuppressIndex` (src/foundation/suppress/suppress-index.ts) resolves each
 *   entity's entry file with the bare `project.getSourceFile(entity.entryFilePath)`.
 *   `graphEntityResolver` emits relative POSIX `entryFilePath`s ('src/feature/widget.ts'),
 *   but a real cold-build project (`loadSourceFiles`) keys files by ABSOLUTE path, so the
 *   bare lookup returns `undefined` and every entity is silently skipped — `findExpired()`
 *   is empty and `expired-suppress` never fires.
 *
 *   `src/platform/ast/find-source-file.ts` already documents this exact hazard and
 *   provides `sourceFileFor()`, which falls back to a path-suffix match. The fix is to
 *   call `sourceFileFor(project, entity.entryFilePath)` in `buildSuppressIndex` instead
 *   of `project.getSourceFile(...)`. That is foundation source, out of scope here.
 *
 * `it.fails` keeps this as a live canary: when the foundation fix lands, this test
 * starts PASSING, `it.fails` then fails loudly, and this block must flip back to `it`
 * and tighten the assertions (see the commented-out block below).
 */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runRuleOnFixture } from '#rules/test-support/run-fixture.js';

const fixtureRoot = fileURLToPath(new URL('../fixtures/stale-suppression', import.meta.url));

describe('expired-suppress — integration', () => {
  it.fails('flags a suppression directive whose expiry date has passed', async () => {
    const diags = await runRuleOnFixture({
      fixtureRoot,
      ruleId: 'expired-suppress',
      config: { layers: { core: { canImport: [] }, feature: { canImport: [] } } },
    });
    expect(diags.length).toBeGreaterThanOrEqual(1);
    expect(diags.some((d) => d.ruleId === 'expired-suppress')).toBe(true);
    // Once the foundation fix lands, drop `.fails` and tighten to the exact emission:
    //   expect(diags).toHaveLength(1);
    //   expect(diags[0]?.ruleId).toBe('expired-suppress');
    //   // the directive suppresses `layer-boundary`, so its fingerprint is
    //   // `layer-boundary#<hash>` — confirm the exact value against real output.
    //   expect(diags[0]?.fingerprint).toMatch(/^layer-boundary#/);
    //   // `entity` is `suppress.location.file`; whether that is absolute or
    //   // sourceRoot-relative is exactly what the foundation fix decides — read
    //   // it off the real output, do not hard-code a path here.
  });
});
