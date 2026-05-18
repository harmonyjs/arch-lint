/**
 * @fileoverview Vitest configuration — test discovery and the 90% coverage gate.
 */
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['development'] },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'src/**/fixtures/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/fixtures/**',
        'src/types.ts',
        'src/public-api.ts',
      ],
      thresholds: { lines: 90, branches: 90 },
      reporter: ['text', 'html'],
    },
  },
});
