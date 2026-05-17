/**
 * @fileoverview Tests for tokens-import-is-side-effect — tokens are imported side-effect only.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { type TokensImportIsSideEffectOptions, tokensImportIsSideEffect } from './index.js';

const config = {} as unknown as ResolvedConfig;

function graphFor(files: Record<string, string>) {
  return makeGraph({
    nodes: Object.fromEntries(Object.keys(files).map((id) => [id, { kind: 'file' as const }])),
    files,
  });
}

function run(files: Record<string, string>, opts: Partial<TokensImportIsSideEffectOptions> = {}) {
  const graph = graphFor(files);
  return tokensImportIsSideEffect.check(
    graph,
    config,
    makeContext<TokensImportIsSideEffectOptions>('tokens-import-is-side-effect', {
      severity: 'warning',
      options: { allowedImporters: [], requiredForm: 'side-effect', ...opts },
      project: graph.project,
    }),
  );
}

describe('tokens-import-is-side-effect', () => {
  it('has the canonical metadata', () => {
    expect(tokensImportIsSideEffect.pack).toBe('view');
    expect(tokensImportIsSideEffect.engine).toBe('syntactic');
    expect(tokensImportIsSideEffect.defaultSeverity).toBe('warning');
  });

  it('flags a named import from tokens', () => {
    const diags = run({ 'src/App/App.tsx': `import { color } from '../tokens/colors';` });
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({
      ruleId: 'tokens-import-is-side-effect',
      severity: 'warning',
      entity: 'src/App/App.tsx',
      fingerprint: 'src/App/App.tsx#../tokens/colors',
    });
  });

  it('does not flag a side-effect import of tokens', () => {
    expect(run({ 'src/main.tsx': `import './tokens/global';` })).toHaveLength(0);
  });

  it('flags a default import from tokens', () => {
    expect(run({ 'src/App/App.tsx': `import tokens from '../tokens';` })).toHaveLength(1);
  });

  it('flags a namespace import from tokens', () => {
    const diags = run({ 'src/App/App.tsx': `import * as t from '@/tokens/colors';` });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.fingerprint).toBe('src/App/App.tsx#@/tokens/colors');
  });

  it('does not flag an import from a non-tokens path', () => {
    expect(run({ 'src/App/App.tsx': `import { x } from '../lib/util';` })).toHaveLength(0);
  });

  it('allowedImporters excludes a file by exact id', () => {
    expect(
      run(
        { 'src/main.tsx': `import { color } from './tokens/colors';` },
        { allowedImporters: ['src/main.tsx'] },
      ),
    ).toHaveLength(0);
  });

  it('allowedImporters excludes files by per-segment prefix', () => {
    expect(
      run(
        { 'src/theme/setup.ts': `import { color } from '../tokens/colors';` },
        { allowedImporters: ['src/theme'] },
      ),
    ).toHaveLength(0);
  });

  it('deduplicates two identical tokens imports', () => {
    expect(
      run({
        'src/App/App.tsx': `import { a } from '../tokens/x';\nimport { b } from '../tokens/x';`,
      }),
    ).toHaveLength(1);
  });

  it('distinguishes two different token files from one consumer', () => {
    expect(
      run({
        'src/App/App.tsx': `import { a } from '../tokens/x';\nimport { b } from '../tokens/y';`,
      }),
    ).toHaveLength(2);
  });
});
