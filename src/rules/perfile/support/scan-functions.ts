/**
 * @fileoverview Shared per-function scan for function-level perfile rules — walks every
 * file node of the graph, reads its AST from the RuleContext project (D9), visits each
 * function unit, and resolves a function's source location.
 */
import type { Project } from 'ts-morph';
import type { ConsumerGraph, Location } from '../../../types.js';
import { fileNodeIds, sourceFileFor } from '../../syntactic-support/source-files.js';
import type { FunctionUnit } from './functions.js';
import { collectFunctions } from './functions.js';

/** Visits every function unit of every file node, passing the owning file id. */
export function scanFunctions(
  graph: ConsumerGraph,
  project: Project,
  visit: (fileId: string, unit: FunctionUnit) => void,
): void {
  for (const fileId of fileNodeIds(graph)) {
    const sf = sourceFileFor(project, fileId);
    if (sf === undefined) continue;
    for (const unit of collectFunctions(sf)) visit(fileId, unit);
  }
}

/** The 1-based start location of a function unit, anchored to the given file id. */
export function functionLocation(fileId: string, unit: FunctionUnit): Location {
  const node = unit.node;
  return {
    file: fileId,
    line: node.getStartLineNumber(),
    column: node.getStart() - node.getStartLinePos() + 1,
  };
}
