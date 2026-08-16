import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function loadEnvironmentFile() {
  try {
    process.loadEnvFile(".env.local");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function runE2e(environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/phase11-e2e.mjs"], {
      cwd: process.cwd(),
      env: environment,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  loadEnvironmentFile();
  if (process.env.PHASE11_ACCOUNT_VISUAL !== "1") {
    throw new Error("Set PHASE11_ACCOUNT_VISUAL=1 to authorize this test run.");
  }

  const supabase = createClient(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const email = `phase11-account-${randomUUID()}@example.com`;
  const password = `${randomUUID()}${randomUUID()}`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Phase 11 QA" },
  });
  if (error || !data.user) {
    throw new Error(`Unable to create controlled test user: ${error?.message}`);
  }

  try {
    const exitCode = await runE2e({
      ...process.env,
      PHASE11_ACCOUNT_EMAIL: email,
      PHASE11_ACCOUNT_PASSWORD: password,
    });
    if (exitCode !== 0) process.exitCode = exitCode;
  } finally {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      data.user.id,
    );
    if (deleteError) {
      throw new Error(
        `Unable to delete controlled test user: ${deleteError.message}`,
      );
    }
  }
}

await main();
