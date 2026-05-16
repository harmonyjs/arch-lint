/**
 * @fileoverview perfile pack aggregate — collects all 8 entity-shape/size rules for the registry.
 */
import type { Rule } from '../../types.js';
import { fileDescriptionRequired } from './file-description-required/index.js';
import { singleEntityPerFile } from './single-entity-per-file/index.js';
import { noDefaultExport } from './no-default-export/index.js';
import { maxLines } from './max-lines/index.js';
import { maxLinesPerFunction } from './max-lines-per-function/index.js';
import { complexity } from './complexity/index.js';
import { maxParams } from './max-params/index.js';
import { maxOptionalParams } from './max-optional-params/index.js';

/** Every rule of the perfile pack (§13.1). */
export const perfileRules: readonly Rule[] = [
  fileDescriptionRequired,
  singleEntityPerFile,
  noDefaultExport,
  maxLines,
  maxLinesPerFunction,
  complexity,
  maxParams,
  maxOptionalParams,
];
