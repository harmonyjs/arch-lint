/**
 * @fileoverview arch-lint config for the E2E sample fixture project.
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default {
  project: { tsconfig: './tsconfig.json', sourceRoot: 'src', cwd: projectRoot },
  packs: ['layers', 'barrels', 'placement', 'meta'],
  layers: {
    'main.tsx': { canImport: ['App'] },
    'App': { canImport: ['model', 'lib'] },
    'model': { canImport: [] },
    'lib': { canImport: [] },
  },
  baseline: { missingBehavior: 'ignore' },
  rules: {
    'file-description-required': 'off',
    'barrel-is-public-face': {
      severity: 'error',
      enforceForSegments: 'all',
      allowExplicitIndex: false,
      allowSiblingImports: true,
    },
    'barrel-required-for-role': {
      severity: 'error',
      enforceForSegments: [],
      exemptPaths: [],
    },
    'barrel-narrow-export': {
      severity: 'warning',
      allowPrefixedConstants: false,
      allowTypeReexports: true,
    },
  },
};
