import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createFalClient } from "@fal-ai/client";

const model = "fal-ai/flux/schnell";
const outputDirectory = join(process.cwd(), "public", "media");
const estimatedMaximumUsd = 0.03;

const assets = [
  {
    filename: "phase11-gallery-sunrise-landscape.jpg",
    prompt:
      "Cinematic fantasy landscape for an AI creative gallery: an expansive mountain valley at sunrise, winding silver river, vibrant scarlet and golden clouds, purple wildflowers in the foreground, richly detailed but photorealistic editorial style, wide landscape 4:3, exhilarating colorful atmosphere, no people, no text, no logo, no watermark",
  },
  {
    filename: "phase11-gallery-animal.jpg",
    prompt:
      "Premium animal portrait for an AI creative gallery: a scarlet macaw perched among glossy tropical leaves, feathers in intensely saturated red, cobalt blue and sunshine yellow, humid rainforest background with soft bokeh, sharp wildlife editorial photography, colorful and inviting, square composition, no people, no text, no logo, no watermark",
  },
  {
    filename: "phase11-gallery-fashion.jpg",
    prompt:
      "Premium fashion editorial portrait for an AI creative gallery: a young artist wearing an iridescent violet and coral jacket against a vivid electric-blue studio backdrop, natural skin texture, sculptural color lighting, modern magazine campaign photography, vibrant and polished, square composition, no text, no logo, no watermark",
  },
];

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

async function waitForResult(fal, requestId) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const status = await fal.queue.status(model, { requestId, logs: false });
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

async function generate(fal, asset) {
  const submission = await fal.queue.submit(model, {
    input: { prompt: asset.prompt, image_size: "landscape_4_3" },
  });
  const result = await waitForResult(fal, submission.request_id);
  const url = result.data?.images?.[0]?.url;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error(`fal returned no HTTPS image URL for ${asset.filename}.`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Unable to download ${asset.filename}: ${response.status}.`,
    );
  }
  await writeFile(
    join(outputDirectory, asset.filename),
    Buffer.from(await response.arrayBuffer()),
  );
  return { filename: asset.filename, requestId: submission.request_id };
}

async function main() {
  loadEnvironmentFile();
  if (process.env.PHASE11_GALLERY_MEDIA_GENERATION !== "1") {
    throw new Error(
      "Set PHASE11_GALLERY_MEDIA_GENERATION=1 to authorize this paid run.",
    );
  }
  const budget = Number(process.env.PHASE11_GALLERY_MEDIA_MAX_USD ?? "1");
  if (!Number.isFinite(budget) || budget < estimatedMaximumUsd || budget > 1) {
    throw new Error(
      "PHASE11_GALLERY_MEDIA_MAX_USD must be between $0.03 and $1.",
    );
  }

  await mkdir(outputDirectory, { recursive: true });
  const fal = createFalClient({ credentials: requiredEnvironment("FAL_KEY") });
  const generated = [];
  for (const asset of assets) generated.push(await generate(fal, asset));
  console.log(
    JSON.stringify(
      {
        status: "succeeded",
        model,
        estimatedMaximumUsd,
        generated,
      },
      null,
      2,
    ),
  );
}

await main();
