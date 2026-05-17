/**
 * @fileoverview Tests for the commander program assembly — `parseRuleList`
 * normalises a comma-separated rule list, and `buildProgram` registers every
 * command, subcommand, and global option the CLI exposes.
 */
import type { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { buildProgram, parseRuleList } from './cli.js';

describe('parseRuleList', () => {
  it('splits a comma list, trimming each id', () => {
    expect(parseRuleList('layer-boundary, lca-placement ,lib-purity')).toEqual([
      'layer-boundary',
      'lca-placement',
      'lib-purity',
    ]);
  });

  it('drops empty segments produced by stray commas', () => {
    expect(parseRuleList('layer-boundary,,, lca-placement,')).toEqual([
      'layer-boundary',
      'lca-placement',
    ]);
  });

  it('returns undefined for undefined input', () => {
    expect(parseRuleList(undefined)).toBeUndefined();
  });

  it('returns undefined for an empty or whitespace-only string', () => {
    expect(parseRuleList('')).toBeUndefined();
    expect(parseRuleList('  , ,  ')).toBeUndefined();
  });
});

/** The direct subcommand names of a commander command, sorted. */
function commandNames(program: Command): string[] {
  return program.commands.map((cmd) => cmd.name()).sort();
}

/** The long-form names of every option registered on a command. */
function optionNames(program: Command): string[] {
  return program.options.map((opt) => opt.long ?? opt.short ?? '');
}

/** Finds a direct subcommand by name, throwing when it is not registered. */
function subcommand(program: Command, name: string): Command {
  const found = program.commands.find((cmd) => cmd.name() === name);
  if (found === undefined) {
    throw new Error(`expected a subcommand named ${name}`);
  }
  return found;
}

describe('buildProgram', () => {
  it('is named arch-lint', () => {
    expect(buildProgram().name()).toBe('arch-lint');
  });

  it('registers the five top-level commands', () => {
    expect(commandNames(buildProgram())).toEqual([
      'baseline',
      'check',
      'explain',
      'graph',
      'watch',
    ]);
  });

  it('exposes the five global options', () => {
    const names = optionNames(buildProgram());
    expect(names).toContain('--config');
    expect(names).toContain('--rules');
    expect(names).toContain('--base');
    expect(names).toContain('--no-baseline');
    expect(names).toContain('--debug');
  });

  it('registers the baseline subcommands init, diff, and prune', () => {
    const baseline = subcommand(buildProgram(), 'baseline');
    expect(commandNames(baseline)).toEqual(['diff', 'init', 'prune']);
  });

  it('gives check a local --changed-only flag', () => {
    const check = subcommand(buildProgram(), 'check');
    expect(optionNames(check)).toContain('--changed-only');
  });

  it('gives baseline prune a local --yes flag', () => {
    const prune = subcommand(subcommand(buildProgram(), 'baseline'), 'prune');
    expect(optionNames(prune)).toContain('--yes');
  });
});
