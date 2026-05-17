/**
 * @fileoverview Public surface of the config subsystem — the barrel that
 * re-exports config discovery, loading and default-resolution operations.
 */
export type { ConfigSource } from './discover.js';
export { discoverConfig } from './discover.js';
export { loadConfig } from './load.js';
export { resolveConfig } from './resolve-defaults.js';
