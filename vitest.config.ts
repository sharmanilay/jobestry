import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'packages/storage/**/*.ts',
        'packages/shared/**/*.ts',
        'chrome-extension/src/background/**/*.ts',
        'pages/content-ui/src/matches/all/**/*.ts',
      ],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/*.config.ts', 'tests/**'],
    },
  },
  resolve: {
    alias: {
      '@extension/storage': path.resolve(__dirname, './packages/storage/lib'),
      '@extension/shared': path.resolve(__dirname, './packages/shared/lib'),
      '@extension/ui': path.resolve(__dirname, './packages/ui/lib'),
    },
  },
});
