import Link from "next/link";

import { CheckoutButtons } from "@/features/billing/checkout-buttons";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

type AccountRow = Readonly<{
  available_credits: number;
  reserved_credits: number;
}>;
type TaskRow = Readonly<{
  id: string;
  modality: "text_to_image" | "image_to_video" | "text_to_speech";
  status: string;
  model_key: string;
  created_at: string;
  completed_at: string | null;
  failure_code: string | null;
}>;
type LedgerRow = Readonly<{
  id: string;
  entry_kind: "credit" | "debit";
  amount_credits: number;
  reason: string;
  created_at: string;
}>;
type PaymentRow = Readonly<{
  id: string;
  product_key: string;
  status: string;
  credits_per_period: number | null;
  created_at: string;
}>;
type SubscriptionRow = Readonly<{
  id: string;
  product_key: string | null;
  status: string;
  credits_per_period: number | null;
  current_period_end: string | null;
}>;

function date(value: string | null) {
  if (!value) return "尚未完成";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function modalityLabel(value: TaskRow["modality"]) {
  return {
    text_to_image: "Image",
    image_to_video: "Video",
    text_to_speech: "Audio",
  }[value];
}

export async function AccountOverview() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const [
    accountResult,
    tasksResult,
    ledgerResult,
    paymentsResult,
    subscriptionsResult,
  ] = await Promise.all([
    supabase
      .from("credit_accounts")
      .select("available_credits,reserved_credits")
      .maybeSingle(),
    supabase
      .from("generation_tasks")
      .select(
        "id,modality,status,model_key,created_at,completed_at,failure_code",
      )
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("ledger_entries")
      .select("id,entry_kind,amount_credits,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("payments")
      .select("id,product_key,status,credits_per_period,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("subscriptions")
      .select("id,product_key,status,credits_per_period,current_period_end")
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  const account = accountResult.data as AccountRow | null;
  const tasks = (tasksResult.data ?? []) as TaskRow[];
  const entries = (ledgerResult.data ?? []) as LedgerRow[];
  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRow[];
  const unavailable = [
    accountResult,
    tasksResult,
    ledgerResult,
    paymentsResult,
    subscriptionsResult,
  ].some(({ error }) => error);

  return (
    <div className="account-overview">
      <section className="credit-summary" aria-labelledby="credits-title">
        <div>
          <p className="eyebrow">CREDITS</p>
          <h2 id="credits-title">可用余额</h2>
        </div>
        <dl>
          <div>
            <dt>可用</dt>
            <dd>{account?.available_credits ?? 0}</dd>
          </div>
          <div>
            <dt>已预留</dt>
            <dd>{account?.reserved_credits ?? 0}</dd>
          </div>
        </dl>
      </section>

      {unavailable ? (
        <p className="form-message form-message--error">
          部分账户记录暂时无法读取。余额和最终状态仍以服务端可信数据为准。
        </p>
      ) : null}

      <section className="account-section" aria-labelledby="history-title">
        <div className="account-section__heading">
          <div>
            <p className="eyebrow">HISTORY</p>
            <h2 id="history-title">最近任务</h2>
          </div>
          <Link href="/studio">新建创作</Link>
        </div>
        {tasks.length ? (
          <div className="account-list">
            {tasks.map((task) => (
              <article key={task.id}>
                <div>
                  <strong>{modalityLabel(task.modality)}</strong>
                  <span>{task.model_key}</span>
                </div>
                <div>
                  <span className={`status-pill status-pill--${task.status}`}>
                    {task.status}
                  </span>
                  <small>{date(task.completed_at ?? task.created_at)}</small>
                </div>
                {task.failure_code ? (
                  <p>失败原因：{task.failure_code}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>还没有任务记录。</p>
            <Link className="button button--secondary" href="/studio">
              打开 Studio
            </Link>
          </div>
        )}
      </section>

      <section className="account-section" aria-labelledby="usage-title">
        <div className="account-section__heading">
          <div>
            <p className="eyebrow">USAGE</p>
            <h2 id="usage-title">Credits 账本</h2>
          </div>
        </div>
        {entries.length ? (
          <div className="account-list account-list--compact">
            {entries.map((entry) => (
              <article key={entry.id}>
                <div>
                  <strong>{entry.reason}</strong>
                  <small>{date(entry.created_at)}</small>
                </div>
                <strong
                  className={
                    entry.entry_kind === "credit"
                      ? "credit-value"
                      : "debit-value"
                  }
                >
                  {entry.entry_kind === "credit" ? "+" : "-"}
                  {entry.amount_credits}
                </strong>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>尚无 Credits 账本记录。</p>
          </div>
        )}
      </section>

      <section className="account-section" aria-labelledby="payment-title">
        <div className="account-section__heading">
          <div>
            <p className="eyebrow">PAYMENT</p>
            <h2 id="payment-title">订阅与付款</h2>
          </div>
        </div>
        <div className="payment-status-grid">
          <div>
            <h3>当前订阅</h3>
            {subscriptions.length ? (
              subscriptions.map((subscription) => (
                <p key={subscription.id}>
                  <strong>{subscription.product_key ?? "subscription"}</strong>
                  <span>
                    {subscription.status}
                    {subscription.credits_per_period
                      ? ` · ${subscription.credits_per_period} Credits / 期`
                      : ""}
                  </span>
                  <small>
                    {subscription.current_period_end
                      ? `当前周期至 ${date(subscription.current_period_end)}`
                      : "等待可信账期记录"}
                  </small>
                </p>
              ))
            ) : (
              <p>尚无订阅记录。</p>
            )}
          </div>
          <div>
            <h3>付款记录</h3>
            {payments.length ? (
              payments.map((payment) => (
                <p key={payment.id}>
                  <strong>{payment.product_key}</strong>
                  <span>
                    {payment.status}
                    {payment.credits_per_period
                      ? ` · ${payment.credits_per_period} Credits / 期`
                      : ""}
                  </span>
                  <small>{date(payment.created_at)}</small>
                </p>
              ))
            ) : (
              <p>尚无付款记录。</p>
            )}
          </div>
        </div>
        <CheckoutButtons />
      </section>
    </div>
  );
}
