import { NextResponse } from "next/server";

import { createFalGenerationAdapter } from "@/integrations/fal/adapter";
import { createSupabaseAdminClient } from "@/integrations/supabase/admin";
import { getAuthenticatedUser } from "@/integrations/supabase/server";

const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumImageBytes = 10 * 1024 * 1024;

function uploadError(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}

export async function POST(request: Request) {
  const { configured, user } = await getAuthenticatedUser();
  if (!configured) {
    return uploadError("auth_unavailable", 503);
  }
  if (!user) {
    return uploadError("authentication_required", 401);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return uploadError("invalid_upload_request", 400);
  }

  const image = formData.get("image");
  if (!(image instanceof Blob)) {
    return uploadError("image_required", 400);
  }
  if (
    !supportedImageTypes.has(image.type) ||
    image.size === 0 ||
    image.size > maximumImageBytes
  ) {
    return uploadError("unsupported_image", 400);
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return uploadError("generation_lifecycle_unavailable", 503);
  }

  try {
    const inputUrl = await createFalGenerationAdapter().uploadInput(image);
    const { error } = await admin.from("media_assets").insert({
      owner_user_id: user.id,
      purpose: "input",
      mime_type: image.type,
      byte_size: image.size,
      provider_url: inputUrl,
      safety_status: "unreviewed",
    });
    if (error) {
      return uploadError("upload_recording_failed", 503);
    }
    return NextResponse.json({ inputUrl }, { status: 201 });
  } catch {
    return uploadError("generation_unavailable", 503);
  }
}
