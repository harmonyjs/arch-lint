/**
 * @fileoverview Fixture feature module — a cross-layer import silenced by a stale directive.
 */
import { base } from '../core/base.js';

// @arch-decision[layer-boundary]: until 2020-01-01, deliberate cross-layer import pending refactor
export const widget: number = base;
