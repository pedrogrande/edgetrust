import { expect, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Set up environment variables for tests
beforeAll(() => {
  // Mock import.meta.env properties
  (global as any).import = {
    meta: {
      env: {
        DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
      },
    },
  };
});

// Clean up React components after each test
afterEach(() => {
  cleanup();
});
