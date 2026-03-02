import { defineConfig, mergeConfig } from 'vitest/config';
import rootConfig from '../../vitest.config.ts';

export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      coverage: {
        // Defensive catch blocks for optional runtime imports (@vercel/edge-config,
        // next/server) are intentionally untestable without the full runtime.
        // Branch threshold is lowered to account for these two guard clauses.
        thresholds: {
          lines: 90,
          functions: 90,
          branches: 80,
          statements: 90,
        },
      },
    },
  }),
);
