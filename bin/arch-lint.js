#!/usr/bin/env node
/**
 * @fileoverview Executable shim for the arch-lint CLI. Imports the compiled
 * runner barrel and hands off the process argv to runCli. It stays plain
 * JavaScript so it runs without a build step of its own.
 */
import { runCli } from '../dist/runner/index.js';

await runCli(process.argv);
