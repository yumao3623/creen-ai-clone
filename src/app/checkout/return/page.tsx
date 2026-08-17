import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getAuthenticatedUser,
  createSupabaseServerClient,
} from "@/integrations/supabase/server";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

type ReturnPageProps = Readonly<{
  searchParams: Promise<{ session_id?: string; canceled?: string }>;
}>;

export default async function CheckoutReturnPage({
  searchParams,
}: ReturnPageProps) {
  const { configured, user } = await getAuthenticatedUser();
  if (!configured)
    redirect("/login?error=auth_unavailable&next=%2Fcheckout%2Freturn");
  if (!user)
    redirect("/login?error=authentication_required&next=%2Fcheckout%2Freturn");

  const params = await searchParams;
  const sessionId = params.session_id;
  const supabase = await createSupabaseServerClient();
  const { data: payment } =
    sessionId && supabase
      ? await supabase
          .from("payments")
          .select("status,product_key,updated_at")
          .eq("stripe_checkout_session_id", sessionId)
          .maybeSingle()
      : { data: null };

  const status =
    payment?.status ?? (params.canceled === "1" ? "canceled" : "pending");
  const message =
    status === "paid"
      ? "付款已确认，Credits 已由签名 Webhook 写入账户。"
      : status === "canceled"
        ? "结账已取消，没有发放 Credits。"
        : status === "failed"
          ? "付款尚未成功，Credits 未发放。"
          : "正在等待 Stripe 签名 Webhook 确认；此页面不会发放 Credits。";

  return (
    <main className="state-page" id="main-content" tabIndex={-1}>
      <p className="eyebrow">付款确认</p>
      <h1>{status === "paid" ? "付款已确认" : "正在确认付款"}</h1>
      <p>{message}</p>
      <Link className="button button--primary" href="/account">
        返回账户
      </Link>
    </main>
  );
}
