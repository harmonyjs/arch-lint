/**
 * @fileoverview Node-id source-file lookup over the RuleContext project (decision D9):
 * syntactic rules read AST from `context.project`, not from a separate ts-morph Project.
 */
import type { Project, SourceFile } from 'ts-morph';
import type { ConsumerGraph } from '#graph/types.js';
/**
 * Returns the parsed SourceFile for a graph node id, reading it from the project
 * carried by RuleContext (D9). The id is tried verbatim first (in-memory test
 * projects key files by node id); failing that, the project's files are matched
 * by path suffix, so a real cold-build project keyed by absolute path resolves
 * too. Returns undefined when no file matches.
 */
export function sourceFileFor(project: Project, id: string): SourceFile | undefined {
  const direct = project.getSourceFile(id);
  if (direct !== undefined) return direct;
  const suffix = `/${id}`;
  return project.getSourceFiles().find((sf) => sf.getFilePath().endsWith(suffix));
}

/** The ids of every file-kind node in the graph, in iteration order. */
export function fileNodeIds(graph: ConsumerGraph): string[] {
  const out: string[] = [];
  for (const node of graph.nodes.values()) {
    if (node.kind === 'file') out.push(node.id);
  }
  return out;
}
