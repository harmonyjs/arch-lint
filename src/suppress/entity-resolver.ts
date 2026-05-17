/**
 * @fileoverview EntityResolver — the minimal contract the suppress subsystem needs
 * from a producer of placement entities. Suppress depends on this interface, never
 * on the graph's entity model directly: graph/ implements it, suppress consumes it,
 * tests supply a hand-written mock.
 */
export interface SuppressEntity {
  readonly id: string;
  readonly name: string;
  readonly entryFilePath: string;
}
export interface EntityResolver {
  /** Every placement entity the suppress index should parse decision data for. */
  listEntities(): readonly SuppressEntity[];
}
