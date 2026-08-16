import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL(
    "../../supabase/migrations/202608160002_phase8_stripe.sql",
    import.meta.url,
  ),
);
const migration = readFileSync(migrationPath, "utf8");

describe("Phase 8 Stripe migration contract", () => {
  it("stores invoice-level idempotency and exposes only bounded RPCs", () => {
    expect(migration).toContain("credit_lots_stripe_invoice_id_unique");
    expect(migration).toContain("ledger_entries_payment_reason_unique");
    expect(migration).toContain("create_stripe_checkout_command");
    expect(migration).toContain("attach_stripe_checkout_session");
    expect(migration).toContain("process_stripe_event");
    expect(migration).toContain(
      "grant execute on function public.process_stripe_event",
    );
  });

  it("grants only from invoice.paid inside a locked account transaction", () => {
    expect(migration).toContain("if v_kind = 'invoice_failed'");
    expect(migration).toContain("perform 1 from public.credit_accounts");
    expect(migration).toContain(
      "where owner_user_id = v_owner_user_id for update",
    );
    expect(migration).toContain("'stripe.credits_granted'");
    expect(migration).toContain("on conflict (stripe_invoice_id)");
    expect(migration).toContain(
      "where public.ledger_entries.payment_id is not null",
    );
    expect(migration).toContain("#variable_conflict use_column");
    expect(migration).toContain("v_credits,\n          null");
  });
});
