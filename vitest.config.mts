import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const stub = fileURLToPath(new URL("./test/stub-empty.ts", import.meta.url));

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: [
      // Build-time guards — no-ops under test so server modules can be imported.
      { find: /^server-only$/, replacement: stub },
      { find: /^client-only$/, replacement: stub },
    ],
  },
  test: {
    // All current tests are pure logic. A component test should add
    // `// @vitest-environment jsdom` at the top of its file.
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
  },
});
