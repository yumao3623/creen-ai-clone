import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createFalClient } from "@fal-ai/client";

const imageModel = "fal-ai/flux/schnell";
const videoModel = "fal-ai/kling-video/v2.1/standard/image-to-video";
const imageEstimateUsd = 0.01;
const videoEstimateUsd = 0.5;
const outputDirectory = join(process.cwd(), "public", "media");
const definitionPath = join(
  process.cwd(),
  "src",
  "content",
  "home-gallery.json",
);

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

function generatedFilename(source) {
  return source.replace(/^\/media\//, "");
}

function generationPrompt(asset) {
  return asset.generationPrompt ?? asset.prompt;
}

async function preserveVideoPosters(definition) {
  const imagesById = new Map(
    definition.images.map((image) => [image.id, image]),
  );

  for (const video of definition.videos.filter((item) => item.sourceImage)) {
    const source = imagesById.get(video.sourceImage);
    if (!source || !video.poster) continue;
    await copyFile(
      join(outputDirectory, generatedFilename(source.src)),
      join(outputDirectory, generatedFilename(video.poster)),
    );
  }
}

async function waitForResult(fal, model, requestId, timeoutMilliseconds) {
  const deadline = Date.now() + timeoutMilliseconds;
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

function imageUrl(result) {
  const url = result.data?.images?.[0]?.url;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error("fal returned no HTTPS image URL.");
  }
  return url;
}

function videoUrl(result) {
  const url = result.data?.video?.url;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error("fal returned no HTTPS video URL.");
  }
  return url;
}

async function main() {
  loadEnvironmentFile();
  if (process.env.HOME_GALLERY_MEDIA_GENERATION !== "1") {
    throw new Error(
      "Set HOME_GALLERY_MEDIA_GENERATION=1 to authorize this paid run.",
    );
  }

  const definition = JSON.parse(await readFile(definitionPath, "utf8"));
  const generatedImages = definition.images.filter((item) =>
    item.id.startsWith("new-"),
  );
  const generatedVideos = definition.videos.filter((item) =>
    item.id.startsWith("new-"),
  );
  const generationMode = process.env.HOME_GALLERY_MEDIA_MODE ?? "all";
  if (generationMode !== "all" && generationMode !== "images") {
    throw new Error("HOME_GALLERY_MEDIA_MODE must be either all or images.");
  }
  const videosToGenerate = generationMode === "images" ? [] : generatedVideos;
  const estimatedMaximumUsd =
    generatedImages.length * imageEstimateUsd +
    videosToGenerate.length * videoEstimateUsd;
  const budget = Number(process.env.HOME_GALLERY_MEDIA_MAX_USD ?? "0");

  if (!Number.isFinite(budget) || budget < estimatedMaximumUsd || budget > 3) {
    throw new Error(
      `HOME_GALLERY_MEDIA_MAX_USD must be between $${estimatedMaximumUsd.toFixed(2)} and $3.00.`,
    );
  }

  await mkdir(outputDirectory, { recursive: true });
  if (generationMode === "images") {
    await preserveVideoPosters(definition);
  }
  const fal = createFalClient({ credentials: requiredEnvironment("FAL_KEY") });
  const imageResults = new Map();
  const generated = [];

  for (const asset of generatedImages) {
    const submission = await fal.queue.submit(imageModel, {
      input: { prompt: generationPrompt(asset), image_size: "landscape_4_3" },
    });
    const result = await waitForResult(
      fal,
      imageModel,
      submission.request_id,
      120_000,
    );
    const url = imageUrl(result);
    const filename = generatedFilename(asset.src);
    await download(url, filename);
    imageResults.set(asset.id, url);
    generated.push({
      kind: "image",
      filename,
      requestId: submission.request_id,
    });
  }

  if (generationMode === "all") {
    await preserveVideoPosters(definition);
  }

  for (const asset of videosToGenerate) {
    const inputUrl = imageResults.get(asset.sourceImage);
    if (!inputUrl) {
      throw new Error(`No generated source image for ${asset.id}.`);
    }
    const submission = await fal.queue.submit(videoModel, {
      input: {
        image_url: inputUrl,
        prompt: asset.prompt,
        duration: asset.duration,
      },
    });
    const result = await waitForResult(
      fal,
      videoModel,
      submission.request_id,
      420_000,
    );
    const filename = generatedFilename(asset.src);
    await download(videoUrl(result), filename);
    generated.push({
      kind: "video",
      filename,
      requestId: submission.request_id,
    });
  }

  console.log(
    JSON.stringify(
      {
        status: "succeeded",
        models: { image: imageModel, video: videoModel },
        estimatedMaximumUsd,
        generated,
      },
      null,
      2,
    ),
  );
}

await main();
