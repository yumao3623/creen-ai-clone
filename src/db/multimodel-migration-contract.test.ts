import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/202608180001_multimodel_prices.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

describe("multi-model price migration contract", () => {
  it("adds versioned prices without changing the existing schema", () => {
    expect(migration).toContain("production.credits.v1");
    expect(migration).toContain("fal.flux.dev");
    expect(migration).toContain("fal.flux.dev.image_to_image");
    expect(migration).toContain("fal.kling.v3.standard.image_to_video");
    expect(migration).toContain("fal.minimax.speech_2_8_turbo");
    expect(migration).toContain(
      "on conflict (price_version_id, modality, model_key, parameter_key) do nothing",
    );
    expect(migration).not.toContain("create table public.generation_tasks");
  });

  it("returns the task model key to webhook mapping", () => {
    expect(migration).toContain("model_key text");
    expect(migration).toContain(
      "select task.id, task.model_key, task.normalized_input, task.status",
    );
  });
});
