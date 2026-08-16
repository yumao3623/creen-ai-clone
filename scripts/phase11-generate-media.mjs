import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createFalClient } from "@fal-ai/client";

const outputDirectory = join(process.cwd(), "public", "media");
const estimatedMaximumUsd = 0.6;

function loadEnvironmentFile() {
  try {
    process.loadEnvFile(join(process.cwd(), ".env.local"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function resultUrl(data, path) {
  const value = path.reduce(
    (current, key) =>
      current && typeof current === "object" ? current[key] : undefined,
    data,
  );
  if (typeof value !== "string" || !value.startsWith("https://")) {
    throw new Error("fal returned no HTTPS media URL.");
  }
  return value;
}

async function waitForResult(fal, model, requestId, timeoutMilliseconds) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    const status = await fal.queue.status(model, {
      requestId,
      logs: false,
    });
    if (status.status === "COMPLETED") {
      return fal.queue.result(model, { requestId });
    }
    if (status.status === "FAILED") {
      throw new Error(`fal request ${requestId} failed.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`fal request ${requestId} did not complete in time.`);
}

async function download(url, filename) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to download ${filename}: ${response.status}.`);
  }
  await writeFile(
    join(outputDirectory, filename),
    Buffer.from(await response.arrayBuffer()),
  );
}

async function generate(fal, model, input, resultPath, filename, timeout) {
  const submission = await fal.queue.submit(model, { input });
  const result = await waitForResult(
    fal,
    model,
    submission.request_id,
    timeout,
  );
  const url = resultUrl(result.data, resultPath);
  await download(url, filename);
  return { filename, requestId: submission.request_id, url };
}

async function main() {
  loadEnvironmentFile();
  if (process.env.PHASE11_MEDIA_GENERATION !== "1") {
    throw new Error(
      "Set PHASE11_MEDIA_GENERATION=1 to authorize this paid run.",
    );
  }
  const budget = Number(process.env.PHASE11_MEDIA_MAX_USD ?? "10");
  if (!Number.isFinite(budget) || budget > 10 || budget < estimatedMaximumUsd) {
    throw new Error("PHASE11_MEDIA_MAX_USD must be between $0.60 and $10.");
  }

  await mkdir(outputDirectory, { recursive: true });
  const fal = createFalClient({ credentials: requiredEnvironment("FAL_KEY") });
  const image = await generate(
    fal,
    "fal-ai/flux/schnell",
    {
      prompt:
        "Premium editorial still life for an AI creative studio: a translucent glass display panel on a dark graphite work surface, luminous lime waveform ribbon, coral sculptural accent, cyan illuminated frame, crisp controlled studio lighting, charcoal and bone-white palette, no people, no text, no logos, no watermark",
      image_size: "landscape_4_3",
    },
    ["images", 0, "url"],
    "phase11-studio.jpg",
    120_000,
  );
  const video = await generate(
    fal,
    "fal-ai/kling-video/v2.1/standard/image-to-video",
    {
      image_url: image.url,
      prompt:
        "The lime waveform gently pulses while the camera makes a slow, steady forward move. No text or logos.",
      duration: "5",
    },
    ["video", "url"],
    "phase11-studio.mp4",
    420_000,
  );
  const audio = await generate(
    fal,
    "fal-ai/minimax/speech-02-hd",
    {
      text: "Create with clarity.",
      voice_setting: { voice_id: "Wise_Woman" },
    },
    ["audio", "url"],
    "phase11-studio.mp3",
    120_000,
  );

  console.log(
    JSON.stringify(
      {
        status: "succeeded",
        estimatedMaximumUsd,
        files: [image.filename, video.filename, audio.filename],
        requestIds: [image.requestId, video.requestId, audio.requestId],
      },
      null,
      2,
    ),
  );
}

await main();
