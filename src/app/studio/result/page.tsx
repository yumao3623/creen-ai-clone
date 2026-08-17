import { redirect } from "next/navigation";

import {
  readGenerationPrompt,
  readGenerationResultAssets,
} from "@/domain/generation/result";
import {
  GenerateControl,
  type ResultHistoryItem,
} from "@/features/studio/generate-control";
import {
  createSupabaseServerClient,
  getAuthenticatedUser,
} from "@/integrations/supabase/server";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

type TaskRow = Readonly<{
  id: string;
  modality: ResultHistoryItem["modality"];
  status: string;
  model_key: string;
  normalized_input: unknown;
  result_reference: unknown;
  created_at: string;
  completed_at: string | null;
}>;

export default async function StudioResultPage() {
  const { configured, user } = await getAuthenticatedUser();
  if (!configured) {
    redirect("/login?error=auth_unavailable&next=%2Fstudio%2Fresult");
  }
  if (!user) {
    redirect("/login?error=authentication_required&next=%2Fstudio%2Fresult");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/login?error=auth_unavailable&next=%2Fstudio%2Fresult");
  }

  const { data } = await supabase
    .from("generation_tasks")
    .select(
      "id,modality,status,model_key,normalized_input,result_reference,created_at,completed_at",
    )
    .order("created_at", { ascending: false })
    .limit(24);

  const history = ((data ?? []) as TaskRow[]).map((task): ResultHistoryItem => {
    const prompt = readGenerationPrompt(task.modality, task.normalized_input);
    const asset = readGenerationResultAssets(task.result_reference)[0];

    return {
      id: task.id,
      modality: task.modality,
      status: task.status,
      modelKey: task.model_key,
      ...(prompt ? { prompt } : {}),
      ...(asset ? { asset } : {}),
      createdAt: task.created_at,
      completedAt: task.completed_at,
    };
  });

  return (
    <main className="studio-result-page" id="main-content" tabIndex={-1}>
      <GenerateControl authenticated history={history} resultRoute />
    </main>
  );
}
