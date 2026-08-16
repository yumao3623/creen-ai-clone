import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL(
    "../../supabase/migrations/202608160001_fix_phase7_digest_search_path.sql",
    import.meta.url,
  ),
);
const migration = readFileSync(migrationPath, "utf8");

describe("Phase 7 pgcrypto search path repair", () => {
  it("adds the Supabase extensions schema to both digest callers", () => {
    expect(migration).toContain(
      "alter function public.create_generation_quote",
    );
    expect(migration).toContain("alter function public.submit_generation_task");
    expect(migration.match(/extensions, pg_temp/g)).toHaveLength(2);
  });
});
