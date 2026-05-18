/**
 * @fileoverview Node-id source-file lookup over the RuleContext project (decision D9):
 * syntactic rules read AST from `context.project`, not from a separate ts-morph Project.
 */
import type { Project, SourceFile } from 'ts-morph';
import type { ConsumerGraph } from '#graph/types.js';

/**
 * Per-Project node-id→SourceFile index, built lazily on the first lookup and
 * held by a WeakMap keyed on the Project. A fresh Project (one per run) gets a
 * fresh index; the index is GC'd with its Project. This turns the otherwise
 * O(N) linear suffix scan in `sourceFileFor` — run once per file by ~8
 * syntactic rules, hence O(rules × N²) overall — into an O(1) Map get.
 */
const indexCache = new WeakMap<Project, Map<string, SourceFile>>();

/**
 * Builds the node-id→SourceFile index for a Project. The original lookup matched
 * a file whose path ended with `/${id}`; this index reproduces that exactly by
 * registering every `/`-anchored suffix of each file path under its id form (the
 * suffix with the leading slash dropped). A path has O(depth) such suffixes, so
 * the index is O(N × depth) — depth being a small constant — and each lookup is
 * O(1). On a suffix collision the first source file wins, mirroring `.find()`'s
 * first-match-wins behavior over the project's source-file iteration order.
 */
function buildIndex(project: Project): Map<string, SourceFile> {
  const index = new Map<string, SourceFile>();
  for (const sf of project.getSourceFiles()) {
    const path = sf.getFilePath();
    for (let slash = path.indexOf('/'); slash !== -1; slash = path.indexOf('/', slash + 1)) {
      const candidateId = path.slice(slash + 1);
      if (!index.has(candidateId)) index.set(candidateId, sf);
    }
  }
  return index;
}

/**
 * Returns the parsed SourceFile for a graph node id, reading it from the project
 * carried by RuleContext (D9). The id is tried verbatim first (in-memory test
 * projects key files by node id); failing that, the project's files are matched
 * by path suffix, so a real cold-build project keyed by absolute path resolves
 * too. The suffix match is served from a per-Project index (memoized in a
 * WeakMap) so repeated lookups are O(1). Returns undefined when no file matches.
 */
export function sourceFileFor(project: Project, id: string): SourceFile | undefined {
  const direct = project.getSourceFile(id);
  if (direct !== undefined) return direct;
  let index = indexCache.get(project);
  if (index === undefined) {
    index = buildIndex(project);
    indexCache.set(project, index);
  }
  return index.get(id);
}

/** The ids of every file-kind node in the graph, in iteration order. */
export function fileNodeIds(graph: ConsumerGraph): string[] {
  const out: string[] = [];
  for (const node of graph.nodes.values()) {
    if (node.kind === 'file') out.push(node.id);
  }
  return out;
}
