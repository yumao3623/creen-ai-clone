import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/config/env";

export function createSupabaseBrowserClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error("Supabase Auth 尚未配置。");
  }

  return createBrowserClient(config.url, config.key);
}
