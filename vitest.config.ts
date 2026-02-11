import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom', // For React component tests
    globals: true,
    setupFiles: ['./src/lib/__tests__/setup.ts'],
    env: {
      // Set environment variables for tests
      DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/__tests__/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/.astro/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
