import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL(
    "../../supabase/migrations/202608150001_phase5_core_domain.sql",
    import.meta.url,
  ),
);
const migration = readFileSync(migrationPath, "utf8");

describe("Phase 5 database migration contract", () => {
  it("creates the core tables and enables RLS for owner-scoped data", () => {
    for (const table of [
      "profiles",
      "generation_tasks",
      "credit_accounts",
      "ledger_entries",
      "idempotency_records",
      "outbox_events",
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
    }

    expect(migration).toContain("generation_tasks_select_own");
    expect(migration).toContain("(select auth.uid()) = owner_user_id");
  });

  it("protects immutable records, state changes, and duplicate submissions", () => {
    expect(migration).toContain("ledger_entries_append_only");
    expect(migration).toContain("generation_tasks_transition_guard");
    expect(migration).toContain(
      "unique (actor_user_id, operation, client_key)",
    );
    expect(migration).toContain("submit_generation_task");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("for update;");
  });
});
