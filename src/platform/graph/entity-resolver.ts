/**
 * @fileoverview graphEntityResolver — the graph-side implementation of the suppress
 * EntityResolver contract. Projects ConsumerGraph file nodes into the SuppressEntity
 * descriptors suppress consumes and resolves each entity's entry SourceFile, so
 * suppress depends only on the interface — never on graph internals or ts-morph.
 */

import type { Project, SourceFile } from 'ts-morph';
import { ancestorsOf, baseNameOf, dropExtension } from '#foundation/entity-id/index.js';
import type { EntityResolver, SuppressEntity } from '#foundation/types/index.js';
import { sourceFileFor as resolveSourceFile } from './source-file-for.js';
import type { ConsumerGraph } from './types.js';

function entityName(entityId: string): string {
  return dropExtension(baseNameOf(entityId));
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
  for (const folder of ancestorsOf(fileId)) {
    if (graph.nodes.get(folder)?.isEntity === true) return folder;
  }
  return fileId;
}
export function graphEntityResolver(graph: ConsumerGraph, project: Project): EntityResolver {
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
    sourceFileFor(entity: SuppressEntity): SourceFile | undefined {
      return resolveSourceFile(project, entity.entryFilePath);
    },
  };
}
