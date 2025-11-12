import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['mobile/**', 'backend/**', 'shared/**', 'node_modules/**'],
    environment: 'node',
    globals: true,
  },
});
