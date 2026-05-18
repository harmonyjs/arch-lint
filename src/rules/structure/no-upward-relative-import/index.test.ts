/**
 * @fileoverview Tests for no-upward-relative-import — `../`-climbing imports are banned.
 */
import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '#foundation/config/types.js';
import { makeContext } from '#rules/test-support/make-context.js';
import { makeGraph } from '#rules/test-support/make-graph.js';
import { only } from '#rules/test-support/only.js';
import { type NoUpwardRelativeImportOptions, noUpwardRelativeImport } from './index.js';

const config = {
  project: { sourceRoot: 'src' },
} as unknown as ResolvedConfig;

function run(files: Record<string, string>, opts: Partial<NoUpwardRelativeImportOptions> = {}) {
  const graph = makeGraph({
    nodes: Object.fromEntries(Object.keys(files).map((id) => [id, { kind: 'file' as const }])),
    files,
  });
  return noUpwardRelativeImport.check(
    graph,
    config,
    makeContext<NoUpwardRelativeImportOptions>('no-upward-relative-import', {
      severity: 'warning',
      options: opts as NoUpwardRelativeImportOptions,
      project: graph.project,
    }),
  );
}

describe('no-upward-relative-import', () => {
  it('has the canonical metadata', () => {
    expect(noUpwardRelativeImport.id).toBe('no-upward-relative-import');
    expect(noUpwardRelativeImport.pack).toBe('structure');
    expect(noUpwardRelativeImport.engine).toBe('syntactic');
    expect(noUpwardRelativeImport.defaultSeverity).toBe('warning');
  });

  it('flags an import that climbs out of its directory', () => {
    const out = run({
      'src/rules/structure/a.ts': `import x from '../../graph/types.js';`,
    });
    const d = only(out);
    expect(d.actual).toBe('../../graph/types.js');
    expect(d.entity).toBe('src/rules/structure/a.ts');
    expect(d.fingerprint).toBe(
      'no-upward-relative-import#src/rules/structure/a.ts#../../graph/types.js',
    );
  });

  it('does not flag a same-folder relative import', () => {
    expect(run({ 'src/a/b.ts': `import x from './helper.js';` })).toEqual([]);
  });

  it('does not flag a downward relative import', () => {
    expect(run({ 'src/a/b.ts': `import x from './sub/thing.js';` })).toEqual([]);
  });

  it('does not flag a subpath alias import', () => {
    expect(run({ 'src/a/b.ts': `import x from '#graph/types.js';` })).toEqual([]);
  });

  it('does not flag a bare package import', () => {
    expect(run({ 'src/a/b.ts': `import { z } from 'zod';` })).toEqual([]);
  });

  it('flags a climbing re-export the same as an import', () => {
    const d = only(run({ 'src/a/b.ts': `export { x } from '../x.js';` }));
    expect(d.actual).toBe('../x.js');
  });

  it('flags a climbing type-only import the same as a plain import', () => {
    const d = only(run({ 'src/a/b.ts': `import type { X } from '../x.js';` }));
    expect(d.actual).toBe('../x.js');
  });

  it('does not flag a specifier that starts with .. but not ../', () => {
    expect(run({ 'src/a/b.ts': `import x from '..foo';` })).toEqual([]);
  });

  it('flags the bare .. specifier that resolves to the parent directory', () => {
    const d = only(run({ 'src/a/b.ts': `import x from '..';` }));
    expect(d.actual).toBe('..');
  });

  it('names the concrete alias path when the target resolves inside sourceRoot', () => {
    const d = only(run({ 'src/rules/structure/a.ts': `import x from '../../graph/types.js';` }));
    expect(d.expected).toBe('an #-subpath alias import');
    expect(d.suggestions[0]?.rationale).toContain('#graph/types.js');
  });

  it('reflects a custom aliasPrefix in the suggestion text', () => {
    const d = only(
      run(
        { 'src/rules/structure/a.ts': `import x from '../../graph/types.js';` },
        {
          aliasPrefix: '~',
        },
      ),
    );
    expect(d.expected).toBe('an ~-subpath alias import');
    expect(d.suggestions[0]?.rationale).toContain('~graph/types.js');
  });

  it('emits one diagnostic per climbing import', () => {
    const out = run({
      'src/a/b.ts': `import x from '../x.js';\nimport y from '../../y.js';`,
    });
    expect(out).toHaveLength(2);
    expect(out.map((d) => d.actual).sort()).toEqual(['../../y.js', '../x.js']);
  });

  it('emits nothing for an empty graph', () => {
    expect(run({})).toEqual([]);
  });
});
