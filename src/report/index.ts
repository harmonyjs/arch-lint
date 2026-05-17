/**
 * @fileoverview Public surface of the report subsystem — the barrel that
 * re-exports the diagnostic-to-string renderer consumed by the runner.
 */
export type { RenderOptions } from './format.js';
export { formatReport, renderDiagnostic } from './format.js';
