import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

const evidenceDirectory = join(process.cwd(), "docs", "real-integration");

function loadEnvironmentFile() {
  try {
    process.loadEnvFile(join(process.cwd(), ".env.local"));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function rpcRow(data, operation) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error(`${operation} returned no row.`);
  }
  return row;
}

async function createTestUser(admin, label, runId) {
  const email = `phase7-${label}-${runId}@example.com`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Unable to create ${label} user: ${error?.message}`);
  }
  return { id: data.user.id, email, password };
}

async function authenticatedClient(url, publicKey, credentials) {
  const client = createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error || !data.session) {
    throw new Error(`Unable to sign in test user: ${error?.message}`);
  }

  return createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { authorization: `Bearer ${data.session.access_token}` },
    },
  });
}

async function waitForProfile(admin, userId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      throw new Error(`Unable to read test profile: ${error.message}`);
    }
    if (data?.id === userId) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Test profile was not created.");
}

async function grantTestCredits(admin, userId) {
  const { error: lotsError } = await admin.from("credit_lots").insert([
    {
      owner_user_id: userId,
      source: "subscription",
      granted_credits: 20,
      remaining_credits: 20,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
    {
      owner_user_id: userId,
      source: "recurring_credit_pack",
      granted_credits: 100,
      remaining_credits: 100,
    },
  ]);
  if (lotsError) {
    throw new Error(`Unable to grant test credit lots: ${lotsError.message}`);
  }

  const { error: accountError } = await admin
    .from("credit_accounts")
    .update({ available_credits: 120, reserved_credits: 0 })
    .eq("owner_user_id", userId);
  if (accountError) {
    throw new Error(
      `Unable to fund test credit account: ${accountError.message}`,
    );
  }
}

async function createImageQuote(client, input) {
  const { data, error } = await client.rpc("create_generation_quote", {
    p_modality: "text_to_image",
    p_model_key: "fal.flux.schnell",
    p_normalized_input: input,
  });
  if (error) {
    throw new Error(`Unable to create image quote: ${error.message}`);
  }
  return rpcRow(data, "create_generation_quote");
}

function submitArgs(clientKey, quoteId, input) {
  return {
    p_client_key: clientKey,
    p_request_hash: sha256(JSON.stringify({ clientKey, quoteId, input })),
    p_modality: "text_to_image",
    p_model_key: "fal.flux.schnell",
    p_normalized_input: input,
    p_quote_id: quoteId,
  };
}

async function recordProviderSubmission(
  admin,
  taskId,
  externalTaskId,
  requestHash,
) {
  const { error } = await admin.rpc("record_generation_provider_submission", {
    p_task_id: taskId,
    p_external_task_id: externalTaskId,
    p_request_hash: requestHash,
    p_model_key: "fal.flux.schnell",
  });
  if (error) {
    throw new Error(`Unable to record provider submission: ${error.message}`);
  }
}

async function finalizeProviderEvent(admin, input) {
  const { data, error } = await admin.rpc("finalize_fal_webhook_event", {
    p_external_task_id: input.externalTaskId,
    p_payload_hash: input.payloadHash,
    p_payload: input.payload,
    p_succeeded: input.succeeded,
    p_result_reference: input.resultReference ?? null,
    p_failure_code: input.failureCode ?? null,
  });
  if (error) {
    throw new Error(`Unable to finalize provider event: ${error.message}`);
  }
  return rpcRow(data, "finalize_fal_webhook_event");
}

async function accountState(admin, userId) {
  const { data, error } = await admin
    .from("credit_accounts")
    .select("available_credits,reserved_credits")
    .eq("owner_user_id", userId)
    .single();
  if (error) {
    throw new Error(`Unable to read credit account: ${error.message}`);
  }
  return data;
}

async function lotState(admin, userId) {
  const { data, error } = await admin
    .from("credit_lots")
    .select("source,remaining_credits")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(`Unable to read credit lots: ${error.message}`);
  }
  return data;
}

function assertJson(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  loadEnvironmentFile();
  const runId = new Date().toISOString().replaceAll(/[:.]/g, "").toLowerCase();
  const url = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const createdUserIds = [];
  const evidence = {
    runId,
    startedAt: new Date().toISOString(),
    providerCalls: 0,
    status: "running",
    checks: {},
  };

  try {
    const fundedUser = await createTestUser(admin, "funded", runId);
    const emptyUser = await createTestUser(admin, "empty", runId);
    createdUserIds.push(fundedUser.id, emptyUser.id);
    await Promise.all([
      waitForProfile(admin, fundedUser.id),
      waitForProfile(admin, emptyUser.id),
    ]);
    await grantTestCredits(admin, fundedUser.id);

    const [fundedClient, emptyClient] = await Promise.all([
      authenticatedClient(url, publicKey, fundedUser),
      authenticatedClient(url, publicKey, emptyUser),
    ]);
    const generationInput = {
      modality: "text_to_image",
      prompt: "Phase 7 controlled Credits transaction validation",
    };

    const fundedQuote = await createImageQuote(fundedClient, generationInput);
    assertJson(
      fundedQuote.credits_cost === 30,
      "Frozen image quote was not 30 Credits.",
    );
    evidence.checks.quote = {
      credits: fundedQuote.credits_cost,
      parameterKey: fundedQuote.parameter_key,
      priceVersionId: fundedQuote.price_version_id,
    };

    const emptyQuote = await createImageQuote(emptyClient, generationInput);
    const { error: insufficientError } = await emptyClient.rpc(
      "submit_generation_task",
      submitArgs(randomUUID(), emptyQuote.quote_id, generationInput),
    );
    assertJson(
      /insufficient credits/i.test(insufficientError?.message ?? ""),
      "Zero-balance submit was not rejected as insufficient Credits.",
    );
    evidence.checks.insufficientBalance = "blocked_before_provider";

    const successKey = randomUUID();
    const successArgs = submitArgs(
      successKey,
      fundedQuote.quote_id,
      generationInput,
    );
    const concurrentResults = await Promise.all([
      fundedClient.rpc("submit_generation_task", successArgs),
      fundedClient.rpc("submit_generation_task", successArgs),
    ]);
    for (const result of concurrentResults) {
      if (result.error) {
        throw new Error(`Concurrent submit failed: ${result.error.message}`);
      }
    }
    const reservedRows = concurrentResults.map((result) =>
      rpcRow(result.data, "submit"),
    );
    assertJson(
      reservedRows[0].task_id === reservedRows[1].task_id,
      "Concurrent duplicate submit created different tasks.",
    );
    assertJson(
      reservedRows.filter((row) => row.was_replayed).length === 1,
      "Concurrent duplicate submit did not produce one replay.",
    );

    const reservedAccount = await accountState(admin, fundedUser.id);
    const reservedLots = await lotState(admin, fundedUser.id);
    assertJson(
      reservedAccount.available_credits === 90 &&
        reservedAccount.reserved_credits === 30,
      "Reservation did not move 30 Credits atomically.",
    );
    assertJson(
      reservedLots[0]?.source === "subscription" &&
        reservedLots[0]?.remaining_credits === 0 &&
        reservedLots[1]?.remaining_credits === 90,
      "Reservation did not consume subscription Credits before pack Credits.",
    );
    evidence.checks.concurrentReservation = {
      taskId: reservedRows[0].task_id,
      replayCount: 1,
      available: 90,
      reserved: 30,
      subscriptionRemaining: 0,
      packRemaining: 90,
    };

    const successExternalId = `phase7-success-${randomUUID()}`;
    await recordProviderSubmission(
      admin,
      reservedRows[0].task_id,
      successExternalId,
      successArgs.p_request_hash,
    );
    const successPayload = {
      request_id: successExternalId,
      status: "OK",
      payload: { images: [{ url: "https://example.com/phase7-result.png" }] },
    };
    const successHash = sha256(JSON.stringify(successPayload));
    const successFinalizeInput = {
      externalTaskId: successExternalId,
      payloadHash: successHash,
      payload: successPayload,
      succeeded: true,
      resultReference: {
        assets: [
          {
            url: "https://example.com/phase7-result.png",
            contentType: "image",
          },
        ],
        providerRequestId: successExternalId,
      },
    };
    const success = await finalizeProviderEvent(admin, successFinalizeInput);
    const successReplay = await finalizeProviderEvent(
      admin,
      successFinalizeInput,
    );
    const settledAccount = await accountState(admin, fundedUser.id);
    assertJson(
      success.task_status === "succeeded",
      "Success did not settle the task.",
    );
    assertJson(
      successReplay.was_replayed,
      "Exact success callback was not replayed.",
    );
    assertJson(
      settledAccount.available_credits === 90 &&
        settledAccount.reserved_credits === 0,
      "Success settlement changed the available balance twice.",
    );
    evidence.checks.successSettlement = {
      status: success.task_status,
      replayed: successReplay.was_replayed,
      available: 90,
      reserved: 0,
    };

    const failureKey = randomUUID();
    const failureArgs = submitArgs(
      failureKey,
      fundedQuote.quote_id,
      generationInput,
    );
    const { data: failureSubmitData, error: failureSubmitError } =
      await fundedClient.rpc("submit_generation_task", failureArgs);
    if (failureSubmitError) {
      throw new Error(
        `Failure-path reservation failed: ${failureSubmitError.message}`,
      );
    }
    const failureReservation = rpcRow(failureSubmitData, "failure submit");
    const failureExternalId = `phase7-failure-${randomUUID()}`;
    await recordProviderSubmission(
      admin,
      failureReservation.task_id,
      failureExternalId,
      failureArgs.p_request_hash,
    );
    const failurePayload = {
      request_id: failureExternalId,
      status: "ERROR",
      payload: { detail: "controlled Phase 7 terminal failure" },
    };
    const failure = await finalizeProviderEvent(admin, {
      externalTaskId: failureExternalId,
      payloadHash: sha256(JSON.stringify(failurePayload)),
      payload: failurePayload,
      succeeded: false,
      failureCode: "provider_failed",
    });
    const compensatedAccount = await accountState(admin, fundedUser.id);
    const compensatedLots = await lotState(admin, fundedUser.id);
    assertJson(
      failure.task_status === "failed",
      "Failure did not finalize the task.",
    );
    assertJson(
      compensatedAccount.available_credits === 90 &&
        compensatedAccount.reserved_credits === 0,
      "Failure did not restore the reserved balance.",
    );
    assertJson(
      compensatedLots[1]?.remaining_credits === 90,
      "Failure did not restore the original pack lot.",
    );

    const { data: failureLedger, error: ledgerError } = await admin
      .from("ledger_entries")
      .select("entry_kind,amount_credits,reason")
      .eq("generation_task_id", failureReservation.task_id)
      .order("created_at", { ascending: true });
    if (ledgerError) {
      throw new Error(`Unable to read failure ledger: ${ledgerError.message}`);
    }
    assertJson(
      failureLedger.length === 2 &&
        failureLedger[0]?.reason === "generation.reserve" &&
        failureLedger[1]?.reason === "generation.compensation",
      "Failure ledger did not preserve debit and compensation entries.",
    );
    evidence.checks.failureCompensation = {
      status: failure.task_status,
      available: 90,
      reserved: 0,
      ledger: failureLedger,
    };

    evidence.status = "passed";
    evidence.completedAt = new Date().toISOString();
    await mkdir(evidenceDirectory, { recursive: true });
    const evidencePath = join(
      evidenceDirectory,
      `phase7-credits-${runId}.json`,
    );
    await writeFile(
      evidencePath,
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    );
    console.log(
      JSON.stringify({ status: evidence.status, evidencePath }, null, 2),
    );
  } finally {
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    }
  }
}

await run();
