/**
 * @fileoverview Public barrel of the metrics facet analyzer — coupling-facet
 * decomposition and candidate-home ranking shared by the coupling rules.
 */

export { rankCandidateHomes, splitSuggestion } from './candidates.js';
export { type CouplingDirection, couplingFacets } from './facets.js';
