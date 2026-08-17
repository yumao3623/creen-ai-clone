import { redirect } from "next/navigation";

import { AccountOverview } from "@/features/account/account-overview";
import { getAuthenticatedUser } from "@/integrations/supabase/server";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AccountPage() {
  const { configured, user } = await getAuthenticatedUser();
  if (!configured) {
    redirect("/login?error=auth_unavailable&next=%2Faccount");
  }
  if (!user) {
    redirect("/login?error=authentication_required&next=%2Faccount");
  }

  const provider =
    typeof user.app_metadata.provider === "string"
      ? user.app_metadata.provider
      : "email";
  const metadataName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : undefined;
  const displayName = metadataName ?? user.email?.split("@")[0] ?? "Creen 用户";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <main className="account-page" id="main-content" tabIndex={-1}>
      <section className="account-card" aria-labelledby="account-title">
        <div className="account-profile">
          <span className="account-profile__avatar" aria-hidden="true">
            {initial}
          </span>
          <div>
            <p className="eyebrow">账户</p>
            <h1 id="account-title">{displayName}</h1>
            <p>{user.email ?? "未提供邮箱"}</p>
            <p>余额、任务和付款状态只从可信服务端记录读取。</p>
          </div>
        </div>

        <dl className="account-details">
          <div>
            <dt>邮箱</dt>
            <dd>{user.email ?? "未提供"}</dd>
          </div>
          <div>
            <dt>登录方式</dt>
            <dd>{provider === "google" ? "Google" : "邮箱 + 密码"}</dd>
          </div>
          <div>
            <dt>用户 ID</dt>
            <dd className="account-details__id">{user.id}</dd>
          </div>
        </dl>

        <AccountOverview />

        <form action="/auth/logout" method="post">
          <button className="button button--secondary" type="submit">
            退出当前会话
          </button>
        </form>
      </section>
    </main>
  );
}
