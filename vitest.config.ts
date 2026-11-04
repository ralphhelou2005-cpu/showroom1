import { defineConfig } from 'vitest/config';

/* database tests: every migration and access rule, on an in-memory Postgres (supabase/tests/db.ts) */
export default defineConfig({
  test: {
    include: ['supabase/tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
