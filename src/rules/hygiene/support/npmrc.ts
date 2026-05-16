/**
 * @fileoverview Line-aware position-aware INI parser of .npmrc — exposes values and the
 * Location of each key (decision D5).
 */
import type { Location } from '../../../types.js';

/** One parsed .npmrc key with its position. */
interface NpmrcEntry {
  readonly value: string;
  readonly location: Location;
}

/** A parsed .npmrc with access to values and key positions. */
export interface NpmrcDoc {
  get(key: string): string | null;
  keyLocation(key: string): Location | null;
  keys(): readonly string[];
  rootLocation(): Location;
}

/** Parses a .npmrc text into a position-aware document. */
export function parseNpmrc(text: string): NpmrcDoc {
  const entries = new Map<string, NpmrcEntry>();
  const order: string[] = [];
  text.split('\n').forEach((raw, idx) => {
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith(';') || trimmed.startsWith('#')) return;
    const eq = raw.indexOf('=');
    if (eq === -1) return;
    const key = raw.slice(0, eq).trim();
    if (key === '') return;
    const value = raw.slice(eq + 1).trim();
    const keyColumn = raw.length - raw.trimStart().length;
    entries.set(key, { value, location: { file: '', line: idx + 1, column: keyColumn + 1 } });
    order.push(key);
  });

  return {
    get(key) {
      return entries.get(key)?.value ?? null;
    },
    keyLocation(key) {
      return entries.get(key)?.location ?? null;
    },
    keys() {
      return order;
    },
    rootLocation() {
      return { file: '', line: 1, column: 1 };
    },
  };
}
