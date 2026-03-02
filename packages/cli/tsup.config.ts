import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/index.ts',
  },
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  platform: 'node',
  external: ['conf'],
  banner: {
    js: '#!/usr/bin/env node',
  },
  outExtension() {
    return { js: '.mjs' };
  },
});
