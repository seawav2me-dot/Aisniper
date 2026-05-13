import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json"],
    },
  },
});
