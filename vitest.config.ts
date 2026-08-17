import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Unit tests for the pure v2 discovery engine (and future pure modules).
// `vite-tsconfig-paths` resolves the `@/` alias from tsconfig so test imports
// match app imports. Node environment — these are pure functions, no DOM.
export default defineConfig({
  plugins: [tsconfigPaths()],
  // Server actions import `server-only`, `next/cache` and `next/headers`,
  // none of which resolve outside a Next runtime — which is why nothing in
  // src/lib/actions had a test before. These aliases are test-only.
  resolve: {
    alias: [
      { find: /^server-only$/, replacement: new URL("./src/test-support/server-only.ts", import.meta.url).pathname },
      { find: /^next\/cache$/, replacement: new URL("./src/test-support/next-cache.ts", import.meta.url).pathname },
      { find: /^next\/headers$/, replacement: new URL("./src/test-support/next-headers.ts", import.meta.url).pathname },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // DB-backed suites (authz.test.ts) need a real Postgres + Supabase env
    // and are wired to THROW rather than skip when it's missing. Keep them
    // out of the default `npm test` so the unit gate stays honest, and run
    // them deliberately via `npm run test:authz` (which sets the env).
    exclude: process.env.RUN_DB_TESTS ? ["**/node_modules/**"] : ["**/node_modules/**", "src/lib/__tests__/authz.test.ts"],
  },
});
