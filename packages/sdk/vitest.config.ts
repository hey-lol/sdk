import { defineConfig, mergeConfig } from 'vitest/config';
import rootConfig from '../../vitest.config.ts';

export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      coverage: {
        // Only measure coverage for TypeScript source files with actual implementations.
        // Excludes stub re-exports (index.ts, services.ts) that will be expanded in later phases.
        include: ['src/**/*.ts'],
        exclude: [
          'src/index.ts',
          'src/services.ts',
          'src/types/**',
          'src/auth/index.ts',
          'src/client/index.ts',
          'src/client/options.ts',
          'src/resources/index.ts',
          '**/*.test.ts',
          '**/*.config.ts',
          'dist/**',
        ],
      },
    },
  }),
);
