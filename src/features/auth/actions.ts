"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { safeInternalPath } from "@/domain/auth/access";
import {
  authErrorMessage,
  type AuthActionState,
  validateCredentials,
} from "@/domain/auth/validation";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

function unavailableState(): AuthActionState {
  return {
    status: "error",
    message:
      "认证服务尚未配置。请先设置 Supabase 项目 URL 与 Publishable Key。",
  };
}

async function appOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredOrigin) {
    return new URL(configuredOrigin).origin;
  }

  if (process.env.NODE_ENV === "development") {
    const requestHeaders = await headers();
    const origin = requestHeaders.get("origin");
    if (origin) {
      return new URL(origin).origin;
    }
  }

  throw new Error("NEXT_PUBLIC_SITE_URL is required for OAuth redirects.");
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = validateCredentials(formData, false);
  if (!credentials.ok) {
    return { status: "error", fieldErrors: credentials.fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return unavailableState();
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return { status: "error", message: authErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  redirect(safeInternalPath(String(formData.get("next") ?? "/account")));
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = validateCredentials(formData, true);
  if (!credentials.ok) {
    return { status: "error", fieldErrors: credentials.fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return unavailableState();
  }

  let origin: string;
  try {
    origin = await appOrigin();
  } catch {
    return unavailableState();
  }

  const next = safeInternalPath(String(formData.get("next") ?? "/account"));
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { status: "error", message: authErrorMessage(error) };
  }

  if (!data.session) {
    return {
      status: "success",
      message:
        "注册请求已提交。若项目启用了邮箱确认，请打开邮件完成确认后登录。",
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function googleLoginAction(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const next = safeInternalPath(String(formData.get("next") ?? "/account"));

  if (!supabase) {
    redirect(`/login?error=auth_unavailable&next=${encodeURIComponent(next)}`);
  }

  let origin: string;
  try {
    origin = await appOrigin();
  } catch {
    redirect(`/login?error=auth_unavailable&next=${encodeURIComponent(next)}`);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=google_unavailable&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(data.url);
}
