# Database / Core Domain

状态：**Phase 5–8 已在远端执行；Phase 8 Stripe Sandbox 与 Credits/Ledger 对账 PASS**

## Migration

核心 schema 位于 `supabase/migrations/202608150001_phase5_core_domain.sql`。它使用 `auth.users` 作为身份主键，并由 `on_auth_user_created` 触发器创建 `profiles` 与零余额 `credit_accounts`。Migration 包含：

- User Mapping、版本化 Price/Quote、Generation、Provider Attempt、Media Metadata；
- Credit Account/Lot/Reservation 与 append-only Ledger；
- Payment/Subscription/Stripe Event Reference；
- Idempotency Record 与 Transactional Outbox；
- Owner-scoped RLS、已有 Auth User 的 Profile/Account 回填、Generation 状态触发器、不可变 Price/Ledger 触发器；
- `submit_generation_task` RPC：以事务级 lock 和唯一约束串行化 `(actor, operation, client_key)`，同 Hash 返回既有 Task，不同 Hash 拒绝，并在同一事务创建 Task、Idempotency Record 与 Outbox Event。

Phase 7 Credits 已在 `202608150004_phase7_credits.sql` 实现，详细事务与验收说明见 `credits.md`。`202608160002_phase8_stripe.sql` 实现 Phase 8 的 Checkout Command、Stripe Invoice/Event 幂等、状态时序保护与仅在 `invoice.paid` 中追加 Credit Lot/Ledger 的事务；真实 Sandbox 发现的函数列名解析与 Checkout 状态时序问题由 `202608160003`–`202608160005` 修复。上述 Phase 8 Migration 均已应用到远端项目，详情见 `stripe.md`。

## Phase 6 fal Webhook Receipt

`supabase/migrations/202608150002_phase6_fal_lifecycle.sql` 增加 `provider_webhook_events` 和只授予 `service_role` 的 `record_fal_webhook_event` RPC。它以 `(provider_key, external_task_id, payload_hash)` 去重，确认关联的 `provider_attempts` 后写入原始 JSON Receipt 与 `generation.fal_webhook_received` Outbox Event。

Phase 7 Migration 会移除 receipt-only RPC，并以 `finalize_fal_webhook_event` 在同一事务保存 Callback Evidence、更新 Task/Provider Attempt、结算或补偿 Reservation。未应用 Phase 7 前，远端仍保持 Phase 6 receipt-only 行为。

## Apply and Verify

使用拥有该项目数据库权限的 Supabase CLI 或 Dashboard SQL Editor 在目标项目执行 migration。标准 CLI 流程：

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Migration Reproducibility 的验收是：在隔离的空数据库从 migration history 重建 schema，例如本地 Supabase 的 `supabase start` 后执行 `supabase db reset`。它不表示把同一 SQL 第二次粘贴到已应用的远端项目；生产项目应通过 migration history 将每个版本应用一次。不要将数据库密码、Access Token 或 Service Role Key 写入 `.env.example`、源码或文档。

执行后需由两个不同的已认证测试用户验证：

1. 用户 A 只能读到自己的 Profile、Quote、Task、Credits、Ledger、Payment 与 Idempotency Record。
2. 用户 A 调用 `submit_generation_task` 两次且使用相同 Key/Hash 时只得到一个 Task；复用同一 Key 但使用不同 Hash 必须失败。
3. 直接修改 Ledger、Price Version 或非法跳过 Generation 状态必须被数据库拒绝。

2026-08-16 已通过 Supabase Dashboard SQL Editor 应用 `202608150004_phase7_credits.sql` 与 `202608160001_fix_phase7_digest_search_path.sql`。真实 JWT/PostgREST Credits 验收 PASS；证据见 `docs/real-integration/phase7-credits-2026-08-15t164751872z.json`。不得重复执行已经应用的 Migration。

2026-08-16 已通过 Supabase Dashboard SQL Editor 应用 `202608160002_phase8_stripe.sql` 与 `202608160003`–`202608160005` 修复。Stripe Sandbox 最终对账为 4 个 Stripe Credit Lot、4 条 Stripe Ledger Credit、65,000 可用 Credits、0 个 Stripe Event Processing Error；脱敏证据见 `docs/real-integration/phase8-stripe-2026-08-16t000000000z.json`。不得重复执行已经应用的 Migration。

2026-08-15 已使用 Supabase Dashboard SQL Editor 首次执行 Migration，并以两个受控 Email/Password 用户的真实 JWT 验证 RLS/Ownership、同 Key 重放、同 Key 不同 Hash 拒绝和并发重复提交只创建一个 Task。Supabase CLI、Direct DB Password 与 Service Role Key 均不是这些已完成验收的前提。Clean-environment Migration History Replay 尚未执行，保持 `NOT EXECUTED`；不得在当前已应用的远端项目重复执行 SQL。
