import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".phase11-next/**",
    ".phase13-next/**",
    "coverage/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scaffold-tmp/**",
  ]),
]);
