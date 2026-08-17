import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/integrations/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

import { GET } from "./route";

const taskId = "6f6b48bc-2dca-4c43-8f41-e1bc6d2cb0d5";

function context(id = taskId) {
  return { params: Promise.resolve({ taskId: id }) };
}

function configureClient(data: unknown, error: unknown = null) {
  mocks.maybeSingle.mockResolvedValue({ data, error });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.from.mockReturnValue({
    select: vi.fn(() => ({ eq: mocks.eq })),
  });
  mocks.authGetUser.mockResolvedValue({ data: { user: { id: "owner-id" } } });
  mocks.createSupabaseServerClient.mockResolvedValue({
    auth: { getUser: mocks.authGetUser },
    from: mocks.from,
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/generations/[taskId]", () => {
  it("returns only the current user's persisted result assets", async () => {
    configureClient({
      id: taskId,
      modality: "image_to_video",
      status: "succeeded",
      model_key: "fal.kling.v2_1.standard.image_to_video",
      normalized_input: {
        imageUrl: "https://input.example/ref.png",
        prompt: "Pan left",
      },
      result_reference: {
        assets: [
          { contentType: "video", url: "https://output.example/result.mp4" },
          { contentType: "video", url: "http://unsafe.example/result.mp4" },
        ],
      },
      failure_code: null,
      completed_at: "2026-08-17T12:00:00.000Z",
    });

    const response = await GET(new Request("https://app.test"), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      task: {
        id: taskId,
        modality: "image_to_video",
        status: "succeeded",
        modelKey: "fal.kling.v2_1.standard.image_to_video",
        prompt: "Pan left",
        resultAssets: [
          { contentType: "video", url: "https://output.example/result.mp4" },
        ],
        failureCode: null,
        completedAt: "2026-08-17T12:00:00.000Z",
      },
    });
  });

  it("requires a session before querying a task", async () => {
    mocks.authGetUser.mockResolvedValue({ data: { user: null } });
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: { getUser: mocks.authGetUser },
    });

    const response = await GET(new Request("https://app.test"), context());

    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not distinguish another user's RLS-hidden task from a missing task", async () => {
    configureClient(null);

    const response = await GET(new Request("https://app.test"), context());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "task_not_found" },
    });
  });

  it("rejects malformed task identifiers without a database read", async () => {
    const response = await GET(
      new Request("https://app.test"),
      context("not-a-task-id"),
    );

    expect(response.status).toBe(400);
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });
});
