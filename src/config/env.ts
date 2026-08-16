export type SupabasePublicConfig = Readonly<{
  url: string;
  key: string;
}>;

type PublicEnvironment = Readonly<{
  NEXT_PUBLIC_SUPABASE_URL?: string | undefined;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string | undefined;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string | undefined;
}>;

export function readSupabasePublicConfig(
  environment: PublicEnvironment,
): SupabasePublicConfig | null {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url && !key) {
    return null;
  }

  if (!url || !key) {
    throw new Error(
      "Supabase Auth 配置不完整：必须同时设置项目 URL 与 Publishable/Anon Key。",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 必须是有效 URL。");
  }

  const isLocalHttp =
    parsedUrl.protocol === "http:" &&
    (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1");

  if (parsedUrl.protocol !== "https:" && !isLocalHttp) {
    throw new Error("Supabase 项目 URL 必须使用 HTTPS（本地开发除外）。");
  }

  return { url: parsedUrl.toString().replace(/\/$/, ""), key };
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  return readSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
