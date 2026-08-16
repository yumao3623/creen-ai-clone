import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createFalClient } from "@fal-ai/client";
import { createClient } from "@supabase/supabase-js";

const requiredEnvironmentNames = [
  "FAL_KEY",
  "FAL_TEXT_TO_IMAGE_MODEL",
  "FAL_IMAGE_TO_VIDEO_MODEL",
  "FAL_TEXT_TO_SPEECH_MODEL",
  "FAL_WEBHOOK_URL",
  "FAL_WEBHOOK_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
];

const expectedModels = {
  image: "fal-ai/flux/schnell",
  video: "fal-ai/kling-video/v2.1/standard/image-to-video",
  speech: "fal-ai/minimax/speech-02-hd",
};

const modelKeys = {
  image: "fal.flux.schnell",
  video: "fal.kling.v2_1.standard.image_to_video",
  speech: "fal.minimax.speech_02_hd",
};

const estimatedMaximumUsd = {
  image: 0.01,
  speech: 0.05,
  video: 0.5,
};

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

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function webhookUrl() {
  const url = new URL(requiredEnvironment("FAL_WEBHOOK_URL"));
  url.searchParams.set("token", requiredEnvironment("FAL_WEBHOOK_TOKEN"));
  return url.toString();
}

function imageUrlFromResult(data) {
  const url = data?.images?.[0]?.url;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error("Text-to-image returned no HTTPS image URL.");
  }
  return url;
}

function videoUrlFromResult(data) {
  const url = data?.video?.url;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error("Image-to-video returned no HTTPS video URL.");
  }
  return url;
}

function audioUrlFromResult(data) {
  const url = data?.audio?.url;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error("Text-to-speech returned no HTTPS audio URL.");
  }
  return url;
}

async function waitForCompletion(fal, model, requestId, timeoutMilliseconds) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    const status = await fal.queue.status(model, { requestId, logs: false });
    if (status.status === "COMPLETED") {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`fal request ${requestId} did not complete before timeout.`);
}

async function waitForWebhookReceipt(supabase, externalTaskId) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("provider_webhook_events")
      .select("id, received_at, payload_hash")
      .eq("provider_key", "fal")
      .eq("external_task_id", externalTaskId)
      .limit(1);
    if (error) {
      throw new Error(`Unable to read fal webhook receipt: ${error.message}`);
    }
    if (data?.[0]) {
      return data[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`No fal webhook receipt arrived for ${externalTaskId}.`);
}

async function createTestUser(supabase, runId) {
  const email = `phase6-real-${runId}@example.com`;
  const password = randomUUID() + randomUUID();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(
      `Unable to create owned Phase 6 test user: ${error?.message}`,
    );
  }
  return data.user.id;
}

async function waitForProfile(supabase, userId) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      throw new Error(
        `Unable to verify Phase 6 test profile: ${error.message}`,
      );
    }
    if (data?.id === userId) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("The owned Phase 6 test profile was not created.");
}

async function createTaskContext(
  supabase,
  userId,
  runId,
  modality,
  modelKey,
  normalizedInput,
) {
  const versionKey = `phase6-real-${runId}`;
  const { data: priceVersion, error: priceVersionError } = await supabase
    .from("price_versions")
    .insert({
      version_key: versionKey,
      effective_from: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (priceVersionError || !priceVersion) {
    throw new Error(
      `Unable to create Phase 6 price version: ${priceVersionError?.message}`,
    );
  }

  const { error: modelPriceError } = await supabase
    .from("model_prices")
    .insert({
      price_version_id: priceVersion.id,
      modality,
      model_key: modelKey,
      credits_cost: 0,
    });
  if (modelPriceError) {
    throw new Error(
      `Unable to create Phase 6 model price: ${modelPriceError.message}`,
    );
  }

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      owner_user_id: userId,
      price_version_id: priceVersion.id,
      parameters_hash: hash(JSON.stringify(normalizedInput)),
      credits_cost: 0,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();
  if (quoteError || !quote) {
    throw new Error(`Unable to create Phase 6 quote: ${quoteError?.message}`);
  }

  const { data: task, error: taskError } = await supabase
    .from("generation_tasks")
    .insert({
      owner_user_id: userId,
      modality,
      model_key: modelKey,
      normalized_input: normalizedInput,
      quote_id: quote.id,
      status: "queued",
      queued_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (taskError || !task) {
    throw new Error(
      `Unable to create Phase 6 generation task: ${taskError?.message}`,
    );
  }

  return task.id;
}

async function registerProviderAttempt(
  supabase,
  taskId,
  modelKey,
  requestId,
  requestHash,
) {
  const { error: attemptError } = await supabase
    .from("provider_attempts")
    .insert({
      generation_task_id: taskId,
      provider_key: "fal",
      model_key: modelKey,
      external_task_id: requestId,
      request_hash: requestHash,
      status: "submitted",
    });
  if (attemptError) {
    throw new Error(
      `Unable to record fal provider attempt: ${attemptError.message}`,
    );
  }

  const { error: taskError } = await supabase
    .from("generation_tasks")
    .update({ provider_reference: requestId })
    .eq("id", taskId);
  if (taskError) {
    throw new Error(
      `Unable to record fal provider reference: ${taskError.message}`,
    );
  }
}

async function submitAndVerify({
  fal,
  supabase,
  model,
  modelKey,
  taskId,
  input,
  resultUrl,
  timeoutMilliseconds,
}) {
  const queued = await fal.queue.submit(model, {
    input,
    webhookUrl: webhookUrl(),
    startTimeout: 60,
  });
  await registerProviderAttempt(
    supabase,
    taskId,
    modelKey,
    queued.request_id,
    hash(JSON.stringify(input)),
  );
  await waitForCompletion(fal, model, queued.request_id, timeoutMilliseconds);
  const result = await fal.queue.result(model, {
    requestId: queued.request_id,
  });
  const url = resultUrl(result.data);
  const receipt = await waitForWebhookReceipt(supabase, queued.request_id);

  const { error: updateError } = await supabase
    .from("provider_attempts")
    .update({ status: "succeeded" })
    .eq("provider_key", "fal")
    .eq("external_task_id", queued.request_id);
  if (updateError) {
    throw new Error(
      `Unable to update fal provider attempt: ${updateError.message}`,
    );
  }

  return {
    taskId,
    externalTaskId: queued.request_id,
    resultUrl: url,
    webhookReceiptId: receipt.id,
    webhookReceivedAt: receipt.received_at,
    inferenceTimeSeconds: result.data?.metrics?.inference_time ?? null,
  };
}

async function prepareEvidence() {
  await mkdir(evidenceDirectory, { recursive: true });
  const files = await readdir(evidenceDirectory);
  const evidenceFiles = files.filter(
    (file) => file.startsWith("phase6-real-") && file.endsWith(".json"),
  );
  if (evidenceFiles.length === 0) {
    const runId = new Date().toISOString().replace(/[:.]/g, "").toLowerCase();
    return {
      evidencePath: join(evidenceDirectory, `phase6-real-${runId}.json`),
      evidence: {
        runId,
        startedAt: new Date().toISOString(),
        budget: { approvedMaximumUsd: 5, estimatedMaximumUsd: 0.56 },
        models: expectedModels,
        status: "started",
        results: {},
      },
    };
  }
  if (
    process.env.PHASE6_REAL_VALIDATION_RESUME !== "1" ||
    evidenceFiles.length !== 1
  ) {
    throw new Error(
      "A Phase 6 real-validation evidence file already exists. Set PHASE6_REAL_VALIDATION_RESUME=1 only to continue its unexecuted modalities.",
    );
  }

  const evidencePath = join(evidenceDirectory, evidenceFiles[0]);
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  if (
    evidence.status !== "interrupted_requires_migration" ||
    !evidence.results?.textToImage?.resultUrl
  ) {
    throw new Error(
      "The prior evidence is not an eligible interrupted Phase 6 run.",
    );
  }
  return { evidencePath, evidence };
}

async function main() {
  loadEnvironmentFile();
  if (process.env.PHASE6_REAL_VALIDATION !== "1") {
    throw new Error(
      "Set PHASE6_REAL_VALIDATION=1 to authorize this paid one-time run.",
    );
  }
  if (Number(process.env.PHASE6_MAX_USD ?? "5") > 5) {
    throw new Error("PHASE6_MAX_USD cannot exceed the approved USD 5 budget.");
  }
  if (
    Object.values(estimatedMaximumUsd).reduce((sum, cost) => sum + cost, 0) >
    Number(process.env.PHASE6_MAX_USD ?? "5")
  ) {
    throw new Error(
      "The configured budget is below the conservative three-request estimate.",
    );
  }

  for (const name of requiredEnvironmentNames) {
    requiredEnvironment(name);
  }
  if (
    process.env.FAL_TEXT_TO_IMAGE_MODEL !== expectedModels.image ||
    process.env.FAL_IMAGE_TO_VIDEO_MODEL !== expectedModels.video ||
    process.env.FAL_TEXT_TO_SPEECH_MODEL !== expectedModels.speech
  ) {
    throw new Error(
      "The configured fal model allow-list does not match the Phase 6 contract.",
    );
  }

  const { evidencePath, evidence } = await prepareEvidence();
  const runId = evidence.runId;
  const supabase = createClient(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const fal = createFalClient({ credentials: requiredEnvironment("FAL_KEY") });
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2));

  try {
    const userId = await createTestUser(
      supabase,
      evidence.status === "interrupted_requires_migration"
        ? `${runId}-resume`
        : runId,
    );
    await waitForProfile(supabase, userId);

    if (!evidence.results.textToImage) {
      const imageInput = {
        prompt:
          "A single small green paper lantern on a white table, studio light",
      };
      const imageTaskId = await createTaskContext(
        supabase,
        userId,
        `${runId}-image`,
        "text_to_image",
        modelKeys.image,
        imageInput,
      );
      evidence.results.textToImage = await submitAndVerify({
        fal,
        supabase,
        model: expectedModels.image,
        modelKey: modelKeys.image,
        taskId: imageTaskId,
        input: imageInput,
        resultUrl: imageUrlFromResult,
        timeoutMilliseconds: 120_000,
      });
      await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
    }

    if (!evidence.results.textToSpeech) {
      const speechInput = {
        text: "Phase six real validation completed.",
        voice_setting: { voice_id: "Wise_Woman" },
      };
      const speechTaskId = await createTaskContext(
        supabase,
        userId,
        `${runId}-speech`,
        "text_to_speech",
        modelKeys.speech,
        speechInput,
      );
      evidence.results.textToSpeech = await submitAndVerify({
        fal,
        supabase,
        model: expectedModels.speech,
        modelKey: modelKeys.speech,
        taskId: speechTaskId,
        input: speechInput,
        resultUrl: audioUrlFromResult,
        timeoutMilliseconds: 120_000,
      });
      await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
    }

    if (!evidence.results.imageToVideo) {
      const videoInput = {
        image_url: evidence.results.textToImage.resultUrl,
        prompt: "The lantern glows softly as the camera moves forward.",
        duration: "5",
      };
      const videoTaskId = await createTaskContext(
        supabase,
        userId,
        `${runId}-video`,
        "image_to_video",
        modelKeys.video,
        videoInput,
      );
      evidence.results.imageToVideo = await submitAndVerify({
        fal,
        supabase,
        model: expectedModels.video,
        modelKey: modelKeys.video,
        taskId: videoTaskId,
        input: videoInput,
        resultUrl: videoUrlFromResult,
        timeoutMilliseconds: 420_000,
      });
    }
    evidence.status = "succeeded";
    evidence.completedAt = new Date().toISOString();
    await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
    console.log(
      JSON.stringify({ status: evidence.status, evidencePath }, null, 2),
    );
  } catch (error) {
    evidence.status = "failed";
    evidence.failedAt = new Date().toISOString();
    evidence.error = error instanceof Error ? error.message : "Unknown error";
    await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
    throw error;
  }
}

await main();
