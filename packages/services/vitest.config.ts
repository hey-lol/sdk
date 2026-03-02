import { defineConfig, mergeConfig } from 'vitest/config';
import rootConfig from '../../vitest.config.ts';

export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      coverage: {
        // Only measure coverage for TypeScript source files with actual implementations.
        // Excludes barrel file (index.ts) that re-exports from other modules.
        include: ['src/**/*.ts'],
        exclude: ['src/index.ts', 'src/types.ts', '**/*.test.ts', '**/*.config.ts', 'dist/**'],
      },
    },
  }),
);
