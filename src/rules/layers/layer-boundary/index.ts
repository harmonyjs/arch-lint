/**
 * @fileoverview layer-boundary rule — enforces canImport barriers between src/ layers.
 */

import type { LayersConfig, ResolvedConfig } from '#foundation/config/types.js';
import { ConfigError } from '#foundation/errors/index.js';
import type { Diagnostic } from '#foundation/types/index.js';
import type { GraphRule, GraphRuleContext } from '#platform/engine/types.js';
import { layerOf } from '#platform/graph/index.js';
import type { Edge } from '#platform/graph/types.js';

/** Validate that every layer's sideEffectOnly is a subset of its canImport (else exit 2). */
function assertSideEffectSubset(layers: LayersConfig): void {
  for (const [layer, conf] of Object.entries(layers)) {
    for (const target of conf.sideEffectOnly ?? []) {
      if (!conf.canImport.includes(target)) {
        throw new ConfigError(
          `layer-boundary config error: sideEffectOnly entry "${target}" of layer ` +
            `"${layer}" is not present in its canImport`,
        );
      }
    }
  }
}

/** Crossing classification for an edge between two distinct, both-mapped layers. */
interface Crossing {
  readonly consumerLayer: string;
  readonly producerLayer: string;
  readonly boundFromSideEffect: boolean;
}

/** Classify an edge; null when it stays in-layer, is unmapped, or is permitted. */
function classifyEdge(edge: Edge, layers: LayersConfig): Crossing | null {
  const consumerLayer = layerOf(edge.consumer, layers);
  const producerLayer = layerOf(edge.producer, layers);
  if (consumerLayer === null || producerLayer === null) return null;
  if (consumerLayer === producerLayer) return null;
  // `layerOf` only ever returns a key present in `layers`.
  const consumerConf = layers[consumerLayer];
  if (consumerConf === undefined) return null;
  const canImport = consumerConf.canImport.includes(producerLayer);
  const sideEffect = (consumerConf.sideEffectOnly ?? []).includes(producerLayer);
  const boundFromSideEffect = sideEffect && edge.symbol !== '';
  if (canImport && !boundFromSideEffect) return null;
  return { consumerLayer, producerLayer, boundFromSideEffect };
}

/** Build the diagnostic for a forbidden crossing. */
function crossingDiagnostic(
  edge: Edge,
  crossing: Crossing,
  severity: Diagnostic['severity'],
): Diagnostic {
  const { consumerLayer, producerLayer, boundFromSideEffect } = crossing;
  return {
    ruleId: 'layer-boundary',
    severity,
    entity: edge.consumer,
    fingerprint: `${edge.consumer}#${edge.producer}`,
    message: `${edge.consumer} imports ${edge.producer} across a layer boundary`,
    actual: producerLayer,
    reason: boundFromSideEffect
      ? `layer ${producerLayer} is side-effect-only — import it with no bindings`
      : `layer ${consumerLayer} may not import layer ${producerLayer}`,
    suggestions: [
      {
        action: 'custom',
        rationale: `add ${producerLayer} to the canImport of ${consumerLayer}, or move the dependency`,
      },
    ],
    location: { file: edge.consumer, line: 1, column: 1 },
  };
}

/** Rule: an edge must not cross into a layer absent from the consumer's canImport. */
export const layerBoundaryRule: GraphRule = {
  id: 'layer-boundary',
  pack: 'layers',
  engine: 'graph',
  defaultSeverity: 'error',
  check: (graph, config: ResolvedConfig, context: GraphRuleContext): Diagnostic[] => {
    assertSideEffectSubset(config.layers);
    const seen = new Set<string>();
    const out: Diagnostic[] = [];
    for (const edge of graph.edges) {
      const crossing = classifyEdge(edge, config.layers);
      if (crossing === null) continue;
      const fingerprint = `${edge.consumer}#${edge.producer}`;
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      out.push(crossingDiagnostic(edge, crossing, context.severity));
    }
    return out;
  },
};
