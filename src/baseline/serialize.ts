/**
 * @fileoverview Baseline file schema, JSON parsing/validation and deterministic
 * serialization — records are always sorted alphabetically by (ruleId, entity,
 * fingerprint). Also wraps file io: loadBaseline / writeBaseline.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import type { BaselineFile, BaselineRecord } from '../types.js';

const baselineRecordSchema = z.object({
  ruleId: z.string(),
  entity: z.string(),
  fingerprint: z.string().optional(),
  firstSeenAt: z.string().optional(),
  note: z.string().optional(),
});

/** Zod schema validating a BaselineFile (§10.1). */
export const baselineFileSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string(),
  generatorVersion: z.string(),
  records: z.array(baselineRecordSchema),
});

/** Parse and validate a baseline JSON string; throws on malformed or invalid input. */
export function parseBaselineFile(text: string): BaselineFile {
  const json: unknown = JSON.parse(text);
  return baselineFileSchema.parse(json) as BaselineFile;
}

/** Sort baseline records alphabetically by (ruleId, entity, fingerprint). */
export function sortRecords(records: readonly BaselineRecord[]): BaselineRecord[] {
  return [...records].sort(compareRecords);
}

/** Serialize a baseline file to pretty JSON with sorted records and a trailing newline. */
export function serializeBaseline(file: BaselineFile): string {
  const normalized: BaselineFile = { ...file, records: sortRecords(file.records) };
  return `${JSON.stringify(normalized, null, 2)}\n`;
}

/** Three-key comparator: ruleId, then entity, then fingerprint ('' sorts first). */
function compareRecords(a: BaselineRecord, b: BaselineRecord): number {
  return (
    a.ruleId.localeCompare(b.ruleId) ||
    a.entity.localeCompare(b.entity) ||
    (a.fingerprint ?? '').localeCompare(b.fingerprint ?? '')
  );
}

/**
 * Read and validate a baseline file from disk. Rejects on a missing file or invalid
 * content; the runner (M7) decides how to treat absence via `baseline.missingBehavior`.
 */
export async function loadBaseline(path: string): Promise<BaselineFile> {
  const text = await readFile(path, 'utf8');
  return parseBaselineFile(text);
}

/** Serialize and write a baseline file to disk (used by `baseline init` / `baseline prune`). */
export async function writeBaseline(path: string, file: BaselineFile): Promise<void> {
  await writeFile(path, serializeBaseline(file), 'utf8');
}
