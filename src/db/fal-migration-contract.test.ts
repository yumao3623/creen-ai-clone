import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL(
    "../../supabase/migrations/202608150002_phase6_fal_lifecycle.sql",
    import.meta.url,
  ),
);
const migration = readFileSync(migrationPath, "utf8");

describe("Phase 6 fal webhook migration contract", () => {
  it("persists an idempotent provider receipt and queues later settlement", () => {
    expect(migration).toContain(
      "create table if not exists public.provider_webhook_events",
    );
    expect(migration).toContain(
      "unique (provider_key, external_task_id, payload_hash)",
    );
    expect(migration).toContain("record_fal_webhook_event");
    expect(migration).toContain("generation.fal_webhook_received");
    expect(migration).toContain("auth.role() <> 'service_role'");
  });

  it("does not let the webhook migration bypass the Credits settlement boundary", () => {
    expect(migration).not.toContain("update public.generation_tasks");
    expect(migration).not.toContain("insert into public.ledger_entries");
  });
});
