#!/usr/bin/env node
/**
 * @fileoverview The published `arch-lint` bin entry. A thin shim that delegates
 * to the compiled CLI in `dist/`, passing the process argv straight through.
 * It stays plain JavaScript so it runs without a build step of its own.
 */
import { runCli } from '../dist/cli/index.js';

await runCli(process.argv);
