/**
 * @fileoverview Tarjan strongly-connected-components over a directed graph —
 * the cycle detector behind the graph document's cycle highlighting.
 */

/** Mutable bookkeeping shared across one Tarjan SCC traversal. */
interface TarjanState {
  /** The directed graph being traversed. */
  readonly adjacency: ReadonlyMap<string, readonly string[]>;
  /** Monotonic discovery counter handing each node its index. */
  counter: number;
  /** Discovery index of each visited node. */
  readonly index: Map<string, number>;
  /** Low-link value of each visited node. */
  readonly low: Map<string, number>;
  /** Nodes currently on the traversal stack. */
  readonly onStack: Set<string>;
  /** The traversal stack. */
  readonly stack: string[];
  /** Completed strongly-connected components. */
  readonly out: string[][];
}

/** Pops the stack down to `root`, emitting the completed strongly-connected component. */
function popComponent(state: TarjanState, root: string): void {
  const component: string[] = [];
  let w: string | undefined;
  do {
    w = state.stack.pop();
    if (w === undefined) break;
    state.onStack.delete(w);
    component.push(w);
  } while (w !== root);
  state.out.push(component);
}

/** Tarjan's recursive visit: indexes `v`, relaxes its low-link, emits its SCC when it is a root. */
function connect(state: TarjanState, v: string): void {
  const vIndex = state.counter;
  state.index.set(v, vIndex);
  let vLow = vIndex;
  state.low.set(v, vLow);
  state.counter += 1;
  state.stack.push(v);
  state.onStack.add(v);
  for (const w of state.adjacency.get(v) ?? []) {
    const wIndex = state.index.get(w);
    if (wIndex === undefined) {
      connect(state, w);
      // `connect` always assigns `low.get(w)`; fall back to its own index defensively.
      vLow = Math.min(vLow, state.low.get(w) ?? Number.POSITIVE_INFINITY);
      state.low.set(v, vLow);
    } else if (state.onStack.has(w)) {
      vLow = Math.min(vLow, wIndex);
      state.low.set(v, vLow);
    }
  }
  if (vLow === vIndex) popComponent(state, v);
}

/** Computes the strongly-connected components of a directed adjacency map. */
export function stronglyConnectedComponents(
  adjacency: ReadonlyMap<string, readonly string[]>,
): readonly (readonly string[])[] {
  const state: TarjanState = {
    adjacency,
    counter: 0,
    index: new Map(),
    low: new Map(),
    onStack: new Set(),
    stack: [],
    out: [],
  };
  for (const v of adjacency.keys()) {
    if (!state.index.has(v)) connect(state, v);
  }
  return state.out;
}

/**
 * The set of nodes that participate in a cycle: members of an SCC larger than
 * one node, plus any node with a self-loop.
 */
export function cyclicNodes(
  adjacency: ReadonlyMap<string, readonly string[]>,
): ReadonlySet<string> {
  const cyclic = new Set<string>();
  for (const component of stronglyConnectedComponents(adjacency)) {
    if (component.length > 1) {
      for (const node of component) cyclic.add(node);
    }
  }
  for (const [node, targets] of adjacency) {
    if (targets.includes(node)) cyclic.add(node);
  }
  return cyclic;
}
