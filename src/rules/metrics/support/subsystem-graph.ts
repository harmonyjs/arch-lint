/**
 * @fileoverview Subsystem-coupling helper for the metrics pack. A subsystem is the
 * first path segment after the source root; this module folds the file graph into
 * per-subsystem coupling figures (efferent/afferent, membership, inbound set).
 */
import type { ConsumerGraph } from '../../../graph/types.js';

/** Per-subsystem coupling figures folded from the file-level ConsumerGraph. */
export interface SubsystemCoupling {
  /** Efferent coupling — distinct subsystems this subsystem depends on. */
  readonly ce: number;
  /** Afferent coupling — distinct subsystems that depend on this subsystem. */
  readonly ca: number;
  /** File ids that belong to this subsystem. */
  readonly files: ReadonlySet<string>;
  /** Subsystems that import at least one file of this subsystem. */
  readonly inboundSubsystems: ReadonlySet<string>;
  /** Subsystems this subsystem imports at least one file from. */
  readonly outboundSubsystems: ReadonlySet<string>;
}

/** Mutable accumulator for a single subsystem while folding the graph. */
interface SubsystemAccumulator {
  readonly files: Set<string>;
  readonly inboundSubsystems: Set<string>;
  readonly outboundSubsystems: Set<string>;
}

/**
 * Subsystem of a file id: strips a leading `sourceRoot + '/'` then takes the segment
 * before the first remaining `/`. A root-level file (no further `/`) is its own subsystem.
 */
export function subsystemOf(fileId: string, sourceRoot: string): string {
  const prefix = `${sourceRoot}/`;
  const rest = fileId.startsWith(prefix) ? fileId.slice(prefix.length) : fileId;
  const slash = rest.indexOf('/');
  return slash === -1 ? rest : rest.slice(0, slash);
}

/** Returns the accumulator for `name`, creating an empty one on first sight. */
function accumulatorFor(
  map: Map<string, SubsystemAccumulator>,
  name: string,
): SubsystemAccumulator {
  let acc = map.get(name);
  if (acc === undefined) {
    acc = { files: new Set(), inboundSubsystems: new Set(), outboundSubsystems: new Set() };
    map.set(name, acc);
  }
  return acc;
}

/**
 * Folds the file-level ConsumerGraph into per-subsystem coupling figures. Every
 * `kind: 'file'` node contributes its membership; every cross-subsystem edge records
 * an outbound link on the consumer subsystem and an inbound link on the producer one.
 */
export function subsystemCoupling(
  graph: ConsumerGraph,
  sourceRoot: string,
): ReadonlyMap<string, SubsystemCoupling> {
  const accumulators = new Map<string, SubsystemAccumulator>();

  for (const node of graph.nodes.values()) {
    if (node.kind !== 'file') continue;
    accumulatorFor(accumulators, subsystemOf(node.id, sourceRoot)).files.add(node.id);
  }

  for (const edge of graph.edges) {
    const consumerSubsystem = subsystemOf(edge.consumer, sourceRoot);
    const producerSubsystem = subsystemOf(edge.producer, sourceRoot);
    if (consumerSubsystem === producerSubsystem) continue;
    accumulatorFor(accumulators, consumerSubsystem).outboundSubsystems.add(producerSubsystem);
    accumulatorFor(accumulators, producerSubsystem).inboundSubsystems.add(consumerSubsystem);
  }

  const coupling = new Map<string, SubsystemCoupling>();
  for (const [name, acc] of accumulators) {
    coupling.set(name, {
      ce: acc.outboundSubsystems.size,
      ca: acc.inboundSubsystems.size,
      files: acc.files,
      inboundSubsystems: acc.inboundSubsystems,
      outboundSubsystems: acc.outboundSubsystems,
    });
  }
  return coupling;
}
