/**
 * @fileoverview The concrete SuppressIndex: maps entity ids to their parsed @arch-decision
 * data and answers isSuppressed / findExpired for the rule engine and `expired-suppress`.
 */
import type { Project } from 'ts-morph';
import type { SuppressConfig } from '../config/types.js';
import type { Diagnostic } from '../types.js';
import { parseEntitySuppress } from './parse.js';
import { isSuppressedByStack } from './precedence.js';
import type {
  EntitySuppressData,
  MalformedSuppress,
  ParsedSuppress,
  SuppressIndex,
} from './types.js';

/** Concrete implementation of the SuppressIndex contract (D8). */
export class SuppressIndexImpl implements SuppressIndex {
  readonly #byEntity: ReadonlyMap<string, EntitySuppressData>;
  readonly #now: Date;

  public constructor(byEntity: ReadonlyMap<string, EntitySuppressData>, now: Date) {
    this.#byEntity = byEntity;
    this.#now = now;
  }

  /** True if a valid @arch-decision on the diagnostic's entity suppresses its rule now. */
  public isSuppressed(diagnostic: Diagnostic): boolean {
    const data = this.#byEntity.get(diagnostic.entity);
    if (data === undefined) return false;
    return isSuppressedByStack(data.valid, diagnostic.ruleId, this.#now);
  }

  /** All expired-valid plus malformed suppress entries, as ParsedSuppress (§9). */
  public findExpired(): readonly ParsedSuppress[] {
    const out: ParsedSuppress[] = [];
    for (const data of this.#byEntity.values()) {
      for (const valid of data.valid) {
        if (valid.expiry !== null && valid.expiry.getTime() < this.#now.getTime()) {
          out.push(valid);
        }
      }
      for (const malformed of data.malformed) {
        out.push(malformedToParsed(malformed));
      }
    }
    return out;
  }

  /** The raw malformed @arch-decision entries, for `expired-suppress` diagnostics. */
  public findMalformed(): readonly MalformedSuppress[] {
    const out: MalformedSuppress[] = [];
    for (const data of this.#byEntity.values()) {
      out.push(...data.malformed);
    }
    return out;
  }
}

/** Project a MalformedSuppress into ParsedSuppress shape for the findExpired contract. */
function malformedToParsed(malformed: MalformedSuppress): ParsedSuppress {
  return {
    ruleId: malformed.ruleId,
    reason: malformed.reason ?? '',
    expiry: null,
    location: malformed.location,
  };
}

/** Minimal entity descriptor the suppress factory needs: id, basename, entry file path. */
export interface SuppressEntity {
  readonly id: string;
  readonly name: string;
  readonly entryFilePath: string;
}

/**
 * Build a SuppressIndex from a ts-morph project: parse every entity's @arch-decision
 * comments. Entities whose entry file is absent from the project are skipped silently.
 */
export function buildSuppressIndex(
  project: Project,
  config: SuppressConfig,
  entities: readonly SuppressEntity[],
  now: Date = new Date(),
): SuppressIndexImpl {
  const byEntity = new Map<string, EntitySuppressData>();
  for (const entity of entities) {
    const entryFile = project.getSourceFile(entity.entryFilePath);
    if (entryFile === undefined) continue;
    byEntity.set(entity.id, parseEntitySuppress(entryFile, entity.name, entity.id, config));
  }
  return new SuppressIndexImpl(byEntity, now);
}
