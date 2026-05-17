/**
 * @fileoverview graphEntityResolver — the graph-side implementation of the suppress
 * EntityResolver contract. Projects ConsumerGraph file nodes into the SuppressEntity
 * descriptors suppress consumes, so suppress depends on the interface, never on graph
 * internals.
 */
import type { EntityResolver, SuppressEntity } from '../suppress/entity-resolver.js';
import type { ConsumerGraph } from './types.js';

function entityName(entityId: string): string {
  const base = entityId.slice(entityId.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}
function entryFileOf(entityId: string, graph: ConsumerGraph): string {
  if (graph.nodes.get(entityId)?.kind === 'file') return entityId;
  const name = entityName(entityId);
  for (const ext of ['.tsx', '.ts']) {
    const candidate = `${entityId}/${name}${ext}`;
    if (graph.nodes.has(candidate)) return candidate;
  }
  return `${entityId}/${name}.ts`;
}
function entityIdOfFile(fileId: string, graph: ConsumerGraph): string {
  const node = graph.nodes.get(fileId);
  if (node?.isEntity === true) return fileId;
  let folder = fileId.slice(0, fileId.lastIndexOf('/'));
  while (folder.length > 0) {
    if (graph.nodes.get(folder)?.isEntity === true) return folder;
    const slash = folder.lastIndexOf('/');
    if (slash < 0) break;
    folder = folder.slice(0, slash);
  }
  return fileId;
}
export function graphEntityResolver(graph: ConsumerGraph): EntityResolver {
  return {
    listEntities(): readonly SuppressEntity[] {
      const ids = new Set<string>();
      for (const node of graph.nodes.values()) {
        if (node.kind !== 'file') continue;
        ids.add(entityIdOfFile(node.id, graph));
      }
      return [...ids].sort().map((id) => ({
        id,
        name: entityName(id),
        entryFilePath: entryFileOf(id, graph),
      }));
    },
  };
}
