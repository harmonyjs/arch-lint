/**
 * @fileoverview Tests for the no-wildcard-reexport rule — forbids export * and export * as ns.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../config/types.js';
import { makeContext } from '../../test-support/make-context.js';
import { makeGraph } from '../../test-support/make-graph.js';
import { noWildcardReexport } from './index.js';

const config = {} as unknown as ResolvedConfig;

/** Builds a graph plus paired project from file id → source text. */
function graphFor(files: Record<string, string>) {
  const nodes = Object.fromEntries(Object.keys(files).map((id) => [id, { kind: 'file' as const }]));
  return makeGraph({ nodes, files });
}

function run(files: Record<string, string>) {
  const graph = graphFor(files);
  return noWildcardReexport.check(
    graph,
    config,
    makeContext('no-wildcard-reexport', { severity: 'error', project: graph.project }),
  );
}

describe('no-wildcard-reexport', () => {
  it('has the canonical metadata', () => {
    expect(noWildcardReexport.id).toBe('no-wildcard-reexport');
    expect(noWildcardReexport.pack).toBe('barrels');
    expect(noWildcardReexport.engine).toBe('syntactic');
    expect(noWildcardReexport.defaultSeverity).toBe('error');
  });

  it('flags export *', () => {
    const diags = run({ 'src/index.ts': `export * from './x';` });
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({
      ruleId: 'no-wildcard-reexport',
      severity: 'error',
      entity: 'src/index.ts',
      fingerprint: 'src/index.ts#./x#*',
    });
  });

  it('flags export * as ns with the ns name in the fingerprint', () => {
    const diags = run({ 'src/index.ts': `export * as utils from './x';` });
    expect(diags).toHaveLength(1);
    expect(diags[0]?.fingerprint).toBe('src/index.ts#./x#utils');
    expect(diags[0]?.message).toContain('Namespace re-export');
  });

  it('does not flag a named re-export', () => {
    expect(run({ 'src/index.ts': `export { A } from './x';` })).toHaveLength(0);
  });

  it('deduplicates two identical export * from one source', () => {
    expect(run({ 'src/index.ts': `export * from './x';\nexport * from './x';` })).toHaveLength(1);
  });

  it('distinguishes export * from export * as ns of one source', () => {
    expect(
      run({ 'src/index.ts': `export * from './x';\nexport * as ns from './x';` }),
    ).toHaveLength(2);
  });

  it('flags several files', () => {
    expect(
      run({
        'src/a/index.ts': `export * from './x';`,
        'src/b/index.ts': `export * from './y';`,
      }),
    ).toHaveLength(2);
  });
});
