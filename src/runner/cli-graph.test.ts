/**
 * @fileoverview Tests that the CLI program registers the `graph` command.
 */
import { describe, expect, it } from 'vitest';
import { buildProgram } from './cli.js';

describe('buildProgram — graph command', () => {
  it('registers a `graph` subcommand', () => {
    const names = buildProgram().commands.map((c) => c.name());
    expect(names).toContain('graph');
  });

  it('declares the --out and --subsystem options on graph', () => {
    const graph = buildProgram().commands.find((c) => c.name() === 'graph');
    const flags = (graph?.options ?? []).map((o) => o.long);
    expect(flags).toContain('--out');
    expect(flags).toContain('--subsystem');
  });
});
