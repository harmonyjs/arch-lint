/**
 * @fileoverview arch-lint config for the E2E sample fixture project.
 */
export default {
  project: { tsconfig: './tsconfig.json', sourceRoot: 'src' },
  packs: ['layers', 'barrels', 'placement', 'meta'],
  layers: {
    'src/main.tsx': { canImport: ['src/App'] },
    'src/App': { canImport: ['src/model', 'src/lib'] },
    'src/model': { canImport: [] },
    'src/lib': { canImport: [] },
  },
  baseline: { missingBehavior: 'ignore' },
  rules: {
    'file-description-required': 'off',
  },
};
