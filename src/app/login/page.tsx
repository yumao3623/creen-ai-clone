import { redirect } from "next/navigation";

import { safeInternalPath } from "@/domain/auth/access";
import { AuthForm } from "@/features/auth/auth-form";
import { authPageNotice } from "@/features/auth/notices";
import { getAuthenticatedUser } from "@/integrations/supabase/server";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

type LoginPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeInternalPath(
    typeof params.next === "string" ? params.next : null,
  );
  const { user } = await getAuthenticatedUser();
  if (user) {
    redirect(next);
  }

  return (
    <main className="auth-page" id="main-content" tabIndex={-1}>
      <AuthForm
        mode="login"
        nextPath={next}
        notice={authPageNotice(
          typeof params.error === "string" ? params.error : undefined,
          typeof params.notice === "string" ? params.notice : undefined,
        )}
      />
    </main>
  );
}
