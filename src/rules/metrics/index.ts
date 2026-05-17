/**
 * @fileoverview metrics pack aggregate — collects the five subsystem-coupling rules
 * for the registry. The pack is opt-in; arch-lint runs it against its own codebase.
 */
import type { GraphRule } from '#rules/types.js';
import { afferentCoupling } from './afferent-coupling/index.js';
import { crossCuttingConcern } from './cross-cutting-concern/index.js';
import { efferentCoupling } from './efferent-coupling/index.js';
import { instability } from './instability/index.js';
import { subsystemCohesion } from './subsystem-cohesion/index.js';

/** Every rule of the metrics pack. */
export const metricsRules: readonly GraphRule[] = [
  efferentCoupling,
  afferentCoupling,
  instability,
  subsystemCohesion,
  crossCuttingConcern,
];
