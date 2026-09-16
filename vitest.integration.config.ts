import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["integration-tests/*.test.ts"],
    expect: {
      requireAssertions: true,
    },
    coverage: {
      include: ["integration-tests/*.test.ts"],
      reporter: ["lcov", "text"],
    },
    globals: true,
    setupFiles: ["integration-tests/setup.ts"],
  },
});
