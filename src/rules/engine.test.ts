/**
 * @fileoverview Tests for runEngine — the §8.1 rule pipeline.
 */

import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import type { BaselineFile } from '../baseline/types.js';
import type { ResolvedConfig } from '../config/types.js';
import { EngineError } from '../errors/index.js';
import { runEngine } from './engine.js';
import { makeSuppressIndex } from './test-support/make-context.js';
import { makeGraph } from './test-support/make-graph.js';
import type { Rule } from './types.js';

function cfg(over: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    project: { tsconfig: 't', sourceRoot: 'src', cwd: '/nonexistent', includeOutOfRoot: false },
    conventions: {
      privateSegment: 'slots',
      sharedSegment: 'items',
      libSegment: 'lib',
      hooksSegment: 'hooks',
      explicitClusterSegment: 'ui',
      modelSegment: 'model',
      indexFiles: ['index.ts', 'index.tsx'],
    },
    packs: ['placement', 'layers', 'meta'],
    layers: {},
    rules: { 'lca-placement': { severity: 'warning', promotionThreshold: 2 } },
    plugins: [],
    ...over,
  } as ResolvedConfig;
}

const emptyProject = new Project({ useInMemoryFileSystem: true });

const strayGraph = makeGraph({
  nodes: {
    'src/App': { kind: 'folder', isEntity: true },
    'src/App/Deep': { kind: 'folder', isEntity: true },
    'src/App/Deep/A': { kind: 'folder', isEntity: true },
    'src/App/Deep/B': { kind: 'folder', isEntity: true },
    'src/App/Stray': { kind: 'folder', isEntity: true },
  },
  entityConsumers: { 'src/App/Stray': ['src/App/Deep/A', 'src/App/Deep/B'] },
});

describe('runEngine pipeline steps 1-2', () => {
  it('collects diagnostics from active rules', () => {
    const result = runEngine(strayGraph, cfg(), makeSuppressIndex(), emptyProject);
    expect(result.diagnostics.some((d) => d.ruleId === 'lca-placement')).toBe(true);
  });

  it('drops diagnostics suppressed by the suppress index', () => {
    const suppress = makeSuppressIndex({ suppressed: ['src/App/Stray'] });
    const result = runEngine(strayGraph, cfg(), suppress, emptyProject);
    expect(result.diagnostics.some((d) => d.entity === 'src/App/Stray')).toBe(false);
  });

  it('runs nothing for an empty graph', () => {
    const result = runEngine(makeGraph({}), cfg(), makeSuppressIndex(), emptyProject);
    expect(result.diagnostics).toEqual([]);
  });

  it('dispatches a manifest rule with only its manifest context', () => {
    let sawContext = false;
    const manifestProbe: Rule = {
      id: 'manifest-probe',
      pack: 'hygiene',
      engine: 'manifest',
      defaultSeverity: 'error',
      check: (context) => {
        sawContext = context.manifests !== undefined && typeof context.cwd === 'string';
        return [];
      },
    };
    runEngine(
      makeGraph({}),
      cfg({ packs: ['hygiene'], plugins: [manifestProbe] }),
      makeSuppressIndex(),
      emptyProject,
    );
    expect(sawContext).toBe(true);
  });

  it('throws when a syntactic rule runs against a graph/project inconsistency', () => {
    const syntacticProbe: Rule = {
      id: 'lib-purity',
      pack: 'layers',
      engine: 'syntactic',
      defaultSeverity: 'error',
      check: () => [],
    };
    const graph = makeGraph({ nodes: { 'src/missing.ts': { kind: 'file' } } });
    expect(() =>
      runEngine(
        graph,
        cfg({ packs: ['layers'], plugins: [syntacticProbe] }),
        makeSuppressIndex(),
        emptyProject,
      ),
    ).toThrow(/src\/missing\.ts/);
  });

  it('does not assert graph/project consistency when no syntactic rule is active', () => {
    const graph = makeGraph({ nodes: { 'src/missing.ts': { kind: 'file' } } });
    expect(() =>
      runEngine(graph, cfg({ packs: ['placement'] }), makeSuppressIndex(), emptyProject),
    ).not.toThrow();
  });

  it('threads the supplied project into rule contexts (D9)', () => {
    let seen: Project | null = null;
    const probe: Rule = {
      id: 'lib-purity',
      pack: 'layers',
      engine: 'syntactic',
      defaultSeverity: 'error',
      check: (_g, _c, context) => {
        seen = context.project;
        return [];
      },
    };
    const project = new Project({ useInMemoryFileSystem: true });
    runEngine(
      makeGraph({}),
      cfg({ packs: ['layers'], plugins: [probe] }),
      makeSuppressIndex(),
      project,
    );
    expect(seen).toBe(project);
  });
});

describe('runEngine pipeline steps 3-4', () => {
  it('throws EngineError when a rule emits a colliding (ruleId, entity, fingerprint)', () => {
    const collidingRule: Rule = {
      id: 'lib-purity',
      pack: 'layers',
      engine: 'syntactic',
      defaultSeverity: 'error',
      check: () => [
        {
          ruleId: 'lib-purity',
          severity: 'error',
          entity: 'src/x.ts',
          fingerprint: 'dup',
          message: 'm',
          actual: 'a',
          reason: 'r',
          suggestions: [],
          location: { file: 'src/x.ts', line: 1, column: 1 },
        },
        {
          ruleId: 'lib-purity',
          severity: 'error',
          entity: 'src/x.ts',
          fingerprint: 'dup',
          message: 'm',
          actual: 'a',
          reason: 'r',
          suggestions: [],
          location: { file: 'src/x.ts', line: 2, column: 1 },
        },
      ],
    };
    const config = cfg({ packs: ['layers'], plugins: [collidingRule] });
    expect(() => runEngine(makeGraph({}), config, makeSuppressIndex(), emptyProject)).toThrow(
      EngineError,
    );
  });

  it('does not throw for well-formed unique diagnostics', () => {
    expect(() => runEngine(strayGraph, cfg(), makeSuppressIndex(), emptyProject)).not.toThrow();
  });
});

describe('runEngine pipeline step 5 (classify + summary + exitCode)', () => {
  it('classifies every diagnostic as new when baseline is null', () => {
    const result = runEngine(strayGraph, cfg(), makeSuppressIndex(), emptyProject, undefined, null);
    expect(result.diagnostics.every((d) => d.status === 'new')).toBe(true);
  });

  it('marks a diagnostic inBaseline when its logical ID is recorded', () => {
    const baseline: BaselineFile = {
      schemaVersion: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
      generatorVersion: '1.0.0',
      records: [{ ruleId: 'lca-placement', entity: 'src/App/Stray' }],
    };
    const result = runEngine(
      strayGraph,
      cfg(),
      makeSuppressIndex(),
      emptyProject,
      undefined,
      baseline,
    );
    const stray = result.diagnostics.find((d) => d.entity === 'src/App/Stray');
    expect(stray?.status).toBe('inBaseline');
  });

  it('reports exitCode 1 when there is a new warning/error diagnostic', () => {
    const result = runEngine(strayGraph, cfg(), makeSuppressIndex(), emptyProject, undefined, null);
    expect(result.exitCode).toBe(1);
  });

  it('reports exitCode 0 when every diagnostic is inBaseline', () => {
    const baseline: BaselineFile = {
      schemaVersion: 1,
      generatedAt: '2026-01-01T00:00:00.000Z',
      generatorVersion: '1.0.0',
      records: [{ ruleId: 'lca-placement', entity: 'src/App/Stray' }],
    };
    const result = runEngine(
      strayGraph,
      cfg(),
      makeSuppressIndex(),
      emptyProject,
      undefined,
      baseline,
    );
    expect(result.exitCode).toBe(0);
  });

  it('fills the summary counters', () => {
    const result = runEngine(strayGraph, cfg(), makeSuppressIndex(), emptyProject, undefined, null);
    expect(result.summary.total).toBe(result.diagnostics.length);
    expect(result.summary.new).toBe(result.diagnostics.length);
    expect(result.summary.inBaseline).toBe(0);
    expect(result.summary.bySeverity.warning).toBeGreaterThan(0);
  });

  it('honors the ruleFilter argument', () => {
    const result = runEngine(
      strayGraph,
      cfg(),
      makeSuppressIndex(),
      emptyProject,
      ['layer-boundary'],
      null,
    );
    expect(result.diagnostics).toEqual([]);
  });

  it('keeps exitCode 0 when the only new diagnostic is info severity', () => {
    const infoRule: Rule = {
      id: 'lib-purity',
      pack: 'layers',
      engine: 'syntactic',
      defaultSeverity: 'error',
      check: () => [
        {
          ruleId: 'lib-purity',
          severity: 'info',
          entity: 'src/x.ts',
          fingerprint: 'f',
          message: 'm',
          actual: 'a',
          reason: 'r',
          suggestions: [],
          location: { file: 'src/x.ts', line: 1, column: 1 },
        },
      ],
    };
    const config = cfg({ packs: ['layers'], plugins: [infoRule] });
    const result = runEngine(
      makeGraph({}),
      config,
      makeSuppressIndex(),
      emptyProject,
      undefined,
      null,
    );
    expect(result.summary.bySeverity.info).toBe(1);
    expect(result.exitCode).toBe(0);
  });
});
