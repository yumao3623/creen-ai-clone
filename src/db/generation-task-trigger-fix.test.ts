import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL(
    "../../supabase/migrations/202608150003_fix_generation_task_transition_trigger.sql",
    import.meta.url,
  ),
);
const migration = readFileSync(migrationPath, "utf8");

describe("generation task transition trigger repair", () => {
  it("keeps the transition guard and returns the updated trigger row directly", () => {
    expect(migration).toContain(
      "create or replace function public.assert_generation_task_transition()",
    );
    expect(migration).toContain("new.updated_at = timezone('utc', now());");
    expect(migration).toContain("return new;");
    expect(migration).not.toContain("return public.set_updated_at()");
  });
});
