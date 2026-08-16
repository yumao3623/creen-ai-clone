import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL(
    "../../supabase/migrations/202608150004_phase7_credits.sql",
    import.meta.url,
  ),
);
const migration = readFileSync(migrationPath, "utf8");

describe("Phase 7 Credits migration contract", () => {
  it("freezes versioned production prices for the three model contracts", () => {
    expect(migration).toContain("production.credits.v1");
    expect(migration).toContain("'fal.flux.schnell', 'default', 30");
    expect(migration).toContain("'duration_5', 2800");
    expect(migration).toContain("'duration_10', 5600");
    expect(migration).toContain("'characters_10', 6");
  });

  it("reserves account and lot balances in the idempotent submit transaction", () => {
    expect(migration).toContain(
      "create or replace function public.create_generation_quote",
    );
    expect(migration).toContain(
      "create table if not exists public.credit_reservation_allocations",
    );
    expect(migration).toContain("when 'subscription' then 0");
    expect(migration).toContain("when 'recurring_credit_pack' then 1");
    expect(migration).toContain("'generation.reserve'");
    expect(migration).toContain("raise exception 'insufficient credits'");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain(
      "set search_path = public, auth, extensions, pg_temp",
    );

    const dropSubmit = migration.indexOf(
      "drop function if exists public.submit_generation_task",
    );
    const createSubmit = migration.indexOf(
      "create or replace function public.submit_generation_task",
    );
    expect(dropSubmit).toBeGreaterThan(-1);
    expect(createSubmit).toBeGreaterThan(dropSubmit);
  });

  it("settles or compensates a terminal callback in the receipt transaction", () => {
    expect(migration).toContain("finalize_fal_webhook_event");
    expect(migration).toContain("status = 'settled'");
    expect(migration).toContain("status = 'compensated'");
    expect(migration).toContain("'generation.compensation'");
    expect(migration).toContain(
      "drop function if exists public.record_fal_webhook_event",
    );
  });
});
