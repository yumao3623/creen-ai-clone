import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next resolves this compiler marker in production. Vitest needs an
      // inert module so server-only modules can be covered in Node tests.
      "server-only": fileURLToPath(
        new URL("./src/test/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      reporter: ["text", "html"],
    },
    include: ["src/**/*.test.ts"],
  },
});
