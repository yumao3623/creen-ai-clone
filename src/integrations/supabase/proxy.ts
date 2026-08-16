import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabasePublicConfig } from "@/config/env";
import { decideProtectedAccess } from "@/domain/auth/access";

function requestHadAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

function enforceAccess(
  request: NextRequest,
  response: NextResponse,
  input: { isAuthenticated: boolean; authConfigured: boolean },
) {
  const decision = decideProtectedAccess({
    pathname: request.nextUrl.pathname,
    isAuthenticated: input.isAuthenticated,
    authConfigured: input.authConfigured,
    hadAuthCookie: requestHadAuthCookie(request),
  });

  if (decision.kind === "redirect") {
    return NextResponse.redirect(new URL(decision.destination, request.url));
  }

  if (decision.kind === "reject") {
    return NextResponse.json(
      { error: { code: decision.code } },
      { status: decision.status },
    );
  }

  return response;
}

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getSupabasePublicConfig();

  if (!config) {
    return enforceAccess(request, response, {
      isAuthenticated: false,
      authConfigured: false,
    });
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

        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && typeof data?.claims?.sub === "string";

  return enforceAccess(request, response, {
    isAuthenticated,
    authConfigured: true,
  });
}
