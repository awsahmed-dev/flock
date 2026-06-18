import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Unit tests for the pure v2 discovery engine (and future pure modules).
// `vite-tsconfig-paths` resolves the `@/` alias from tsconfig so test imports
// match app imports. Node environment — these are pure functions, no DOM.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
