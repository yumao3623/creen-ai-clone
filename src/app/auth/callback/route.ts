import { NextResponse } from "next/server";

import { safeInternalPath } from "@/domain/auth/access";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeInternalPath(requestUrl.searchParams.get("next"));
  const providerError = requestUrl.searchParams.get("error");

  if (providerError) {
    const code =
      providerError === "access_denied"
        ? "oauth_cancelled"
        : "oauth_callback_failed";
    return NextResponse.redirect(
      new URL(
        `/login?error=${code}&next=${encodeURIComponent(next)}`,
        requestUrl.origin,
      ),
    );
  }

  const code = requestUrl.searchParams.get("code");
  const supabase = await createSupabaseServerClient();

  if (!code || !supabase) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${supabase ? "oauth_callback_failed" : "auth_unavailable"}&next=${encodeURIComponent(next)}`,
        requestUrl.origin,
      ),
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=oauth_callback_failed&next=${encodeURIComponent(next)}`,
        requestUrl.origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
