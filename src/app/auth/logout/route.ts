import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabasePublicConfig } from "@/config/env";

export async function POST(request: NextRequest) {
  const loginUrl = new URL("/login?notice=signed_out", request.url);
  const response = NextResponse.redirect(loginUrl, { status: 303 });
  const config = getSupabasePublicConfig();

  if (!config) {
    return NextResponse.redirect(
      new URL("/login?error=auth_unavailable", request.url),
      { status: 303 },
    );
  }

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });

  await supabase.auth.signOut({ scope: "local" });

  return response;
}
