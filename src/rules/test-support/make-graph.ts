/**
 * @fileoverview Factory that assembles frozen mock ConsumerGraph instances — paired with
 * a matching in-memory ts-morph Project — for rule unit tests (decision D9).
 */
import { Project } from 'ts-morph';
import type { ConsumerGraph, Edge, Node, UnresolvedImport } from '../../graph/types.js';
interface NodeSpec {
  readonly kind?: 'file' | 'folder';
  readonly isEntity?: boolean;
  readonly placementMode?: 'reactive' | 'explicit';
  readonly cluster?: string;
}

export interface MakeGraphSpec {
  readonly nodes?: Readonly<Record<string, NodeSpec>>;
  readonly edges?: readonly Edge[];
  readonly entityConsumers?: Readonly<Record<string, readonly string[]>>;
  readonly unresolved?: readonly UnresolvedImport[];
  readonly rootDir?: string;
  /** File id → source text; each entry is parsed into the paired in-memory Project. */
  readonly files?: Readonly<Record<string, string>>;
}

/** A mock graph paired with the in-memory Project a RuleContext would carry (D9). */
export type MockGraph = ConsumerGraph & { readonly project: Project };

function toNode(id: string, spec: NodeSpec): Node {
  const base = {
    id,
    kind: spec.kind ?? 'file',
    isEntity: spec.isEntity ?? false,
    placementMode: spec.placementMode ?? 'reactive',
  } as const;
  return spec.cluster === undefined ? base : { ...base, cluster: spec.cluster };
}

/** Builds the in-memory ts-morph Project, seeded from the files spec. */
function buildProject(files: Readonly<Record<string, string>>): Project {
  const project = new Project({ useInMemoryFileSystem: true });
  for (const [id, text] of Object.entries(files)) {
    project.createSourceFile(id, text);
  }
  return project;
}

/** Indexes edges into the consumersOf (by producer) and producersOf (by consumer) maps. */
function indexEdges(edges: readonly Edge[]): {
  readonly consumersOf: ReadonlyMap<string, readonly Edge[]>;
  readonly producersOf: ReadonlyMap<string, readonly Edge[]>;
} {
  const consumersOf = new Map<string, Edge[]>();
  const producersOf = new Map<string, Edge[]>();
  for (const edge of edges) {
    appendTo(consumersOf, edge.producer, edge);
    appendTo(producersOf, edge.consumer, edge);
  }
  return { consumersOf, producersOf };
}

/** Pushes `edge` into the array bucketed under `key`, creating the bucket on demand. */
function appendTo(map: Map<string, Edge[]>, key: string, edge: Edge): void {
  const bucket = map.get(key);
  if (bucket === undefined) {
    map.set(key, [edge]);
  } else {
    bucket.push(edge);
  }
}

/** Builds a frozen mock ConsumerGraph plus its in-memory ts-morph Project (D9). */
export function makeGraph(spec: MakeGraphSpec): MockGraph {
  const nodes = new Map<string, Node>();
  for (const [id, nodeSpec] of Object.entries(spec.nodes ?? {})) {
    nodes.set(id, toNode(id, nodeSpec));
  }
  const entityConsumersOf = new Map<string, readonly string[]>();
  for (const [entity, consumers] of Object.entries(spec.entityConsumers ?? {})) {
    entityConsumersOf.set(entity, consumers);
  }
  const edges = spec.edges ?? [];
  const { consumersOf, producersOf } = indexEdges(edges);
  const graph: MockGraph = {
    nodes,
    edges,
    consumersOf,
    producersOf,
    entityConsumersOf,
    unresolved: spec.unresolved ?? [],
    builtAt: new Date(0),
    rootDir: spec.rootDir ?? 'src',
    project: buildProject(spec.files ?? {}),
  };
  return Object.freeze(graph);
}
