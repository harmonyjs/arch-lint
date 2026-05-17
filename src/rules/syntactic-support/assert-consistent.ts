/**
 * @fileoverview Dev-mode assertion that the ConsumerGraph and the rule-context
 * ts-morph project agree on the set of source files: every graph file node has a
 * matching SourceFile and vice versa. A mismatch is a build bug, not user error,
 * so it throws — but only outside production, to keep the hot path free.
 */
import type { Project } from 'ts-morph';
import type { ConsumerGraph } from '../../graph/types.js';
import { fileNodeIds } from './find-source-file.js';

function hasFileFor(projectIds: ReadonlySet<string>, id: string): boolean {
  if (projectIds.has(id)) return true;
  const suffix = `/${id}`;
  for (const p of projectIds) if (p.endsWith(suffix)) return true;
  return false;
}

export function assertGraphProjectConsistent(graph: ConsumerGraph, project: Project): void {
  if (process.env['NODE_ENV'] === 'production') return;
  const graphFileIds = fileNodeIds(graph);
  const projectIds = new Set(project.getSourceFiles().map((sf) => sf.getFilePath() as string));
  const graphIdSet = new Set(graphFileIds);
  const missingInProject = graphFileIds.filter((id) => !hasFileFor(projectIds, id));
  const missingInGraph = [...projectIds].filter((p) => {
    if (graphIdSet.has(p)) return false;
    return ![...graphIdSet].some((id) => p.endsWith(`/${id}`));
  });
  if (missingInProject.length > 0 || missingInGraph.length > 0) {
    throw new Error(
      `graph/project inconsistency: ${missingInProject.length} graph file node(s) ` +
        `without a SourceFile [${missingInProject.join(', ')}]; ` +
        `${missingInGraph.length} SourceFile(s) without a graph node [${missingInGraph.join(', ')}]`,
    );
  }
}
