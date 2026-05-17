/**
 * @fileoverview Public surface of the runner subsystem — the barrel that
 * `bin/arch-lint.js` imports. Re-exports the CLI entry point `runCli` and
 * the programmatic `check` operation.
 */
export { check, resolveBaseline, runCheck } from './check.js';
