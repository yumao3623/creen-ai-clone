import { NextResponse } from "next/server";

import {
  readGenerationPrompt,
  readGenerationResultAssets,
} from "@/domain/generation/result";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

const taskIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TaskRow = Readonly<{
  id: string;
  modality: "text_to_image" | "image_to_video" | "text_to_speech";
  status: string;
  model_key: string;
  normalized_input: unknown;
  result_reference: unknown;
  failure_code: string | null;
  completed_at: string | null;
}>;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  if (!taskIdPattern.test(taskId)) {
    return NextResponse.json(
      { error: { code: "invalid_task_id" } },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: { code: "auth_unavailable" } },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "authentication_required" } },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("generation_tasks")
    .select(
      "id,modality,status,model_key,normalized_input,result_reference,failure_code,completed_at",
    )
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: { code: "task_unavailable" } },
      { status: 503 },
    );
  }
  if (!data) {
    // RLS makes an unknown task and another user's task indistinguishable.
    return NextResponse.json(
      { error: { code: "task_not_found" } },
      { status: 404 },
    );
  }

  const task = data as TaskRow;
  return NextResponse.json({
    task: {
      id: task.id,
      modality: task.modality,
      status: task.status,
      modelKey: task.model_key,
      prompt: readGenerationPrompt(task.modality, task.normalized_input),
      resultAssets: readGenerationResultAssets(task.result_reference),
      failureCode: task.failure_code,
      completedAt: task.completed_at,
    },
  });
}
