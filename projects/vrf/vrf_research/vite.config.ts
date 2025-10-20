import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({ include: ['src'] })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VrfBls12381',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['@noble/curves', 'ethers'],
      output: {
        globals: {
          '@noble/curves': 'NobleCurves',
          'ethers': 'ethers',
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});

