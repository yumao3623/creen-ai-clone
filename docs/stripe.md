# Phase 8 Stripe

状态：**代码、隔离契约、远端 Migration 与 Stripe Sandbox E2E PASS；本轮停止在 Phase 8**

## 冻结范围

- Stripe Hosted Checkout Sandbox；
- 一个 `subscription` 和一个 `recurring_credit_pack`；
- 每个商品均是活动的、USD、Test Mode、recurring Stripe Price；
- 不实现 Coupon、Trial、税务、多币种、退款、复杂 Proration、升降级或 Customer Portal。

## 配置

`.env.local` 只配置以下 server-only 变量：

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUBSCRIPTION_PRICE_ID=price_...
STRIPE_RECURRING_CREDIT_PACK_PRICE_ID=price_...
```

`NEXT_PUBLIC_SITE_URL` 用于 Stripe Return URL；部署环境必须为 HTTPS。两个 Price 必须不同，且各自的 Stripe Dashboard Metadata 都要有正整数 `credits`。本次 Sandbox 验收的 Subscription 为每期 `25000` Credits，Recurring Credit Pack 为每期 `7500` Credits。服务端每次创建 Checkout 都重新读取并验证该 Price，浏览器不能提交金额、Price ID 或 Credits 数量。

## 可信支付链路

1. 已认证账户向 `POST /api/stripe/checkout` 提交 Product Key 和 UUID Client Key。
2. 服务端按 Product Allow-list 读取 Stripe Test Price，校验 metadata，再创建本地幂等 Payment Command。
3. 服务端用 Payment ID 作为 Stripe Idempotency Key，创建 Hosted Checkout Session，并将 User、Payment、Product、Price、Credits 写到 Session 与 Subscription Metadata。
4. `/checkout/return` 只读该用户的本地 Payment 状态；它永远不改变余额。
5. `POST /api/webhooks/stripe` 读取 Raw Body、验证 `stripe-signature` 和 `whsec_...`，拒绝 Live Mode Event。
6. 只有 `invoice.paid` 才会在数据库事务中创建 Credit Lot、增加 Account，并追加不可变 Ledger Credit。`checkout.session.completed` 仅关联 Checkout/Subscription；`invoice.payment_failed` 仅同步失败/Past Due 状态。

事件 Allow-list 为 `checkout.session.completed`、`checkout.session.expired`、`invoice.paid`、`invoice.payment_failed`、`customer.subscription.created`、`customer.subscription.updated` 和 `customer.subscription.deleted`。未知、Live Mode 或不带本项目 Subscription Metadata 的 Event 被安全忽略。

## 幂等与时序

`202608160002_phase8_stripe.sql` 新增：

- `(owner_user_id, client_key)` Checkout Command 幂等；
- Stripe Invoice ID 在 Payment 与 Credit Lot 的唯一约束；
- `(payment_id, reason)` Ledger 唯一约束；
- 每个 Stripe Event ID 的 Receipt、处理结果与错误记录；
- Payment/Subscription 的 Stripe Event 时间戳保护，避免晚到 Event 覆盖更新状态；
- 只对 `service_role` 授权 Webhook Mapping 与 Credits 发放 RPC。

重复 Invoice Event 只返回 replay；乱序 Event 使用 Stripe 的 Event 创建时间保护状态。若关联数据临时不可用，Receipt 保留 `processing_error` 并返回 503，使 Stripe 重试，不会把浏览器 Return 作为替代可信来源。

## 已完成的真实验收

目标 Supabase 项目已应用 `202608160002_phase8_stripe.sql`，以及为真实事件发现的问题新增的 `202608160003`、`202608160004`、`202608160005` 修复 Migration。Stripe CLI 在本地把 Sandbox/Test Webhook 转发到：

```text
http://localhost:3001/api/webhooks/stripe
```

已在 Stripe Sandbox 完成 Subscription 和 recurring Credit Pack 各一次，并完成 Cancel、Decline、3DS、Bank/Link Sandbox Payment 与 `invoice.paid` 重放。首次并发到达的 Subscription Event 出现死锁后，改为顺序重放，最终全部成功；Checkout 完成事件晚于权威 Subscription/Invoice Event 导致的 `pending` 状态已由 `202608160005` 修复并核对为 `active`。

- Return URL 不增加 Credits；
- 四笔已付款只创建四个 Credit Lot 和四条 Stripe Ledger Credit；
- Cancel 和 Decline 留下两笔 pending Payment，均未发放 Credits；
- 重放同一 `invoice.paid` 返回成功且没有增加 Credits；
- 最终有两个 `subscription`、两个 `recurring_credit_pack` Subscription Rows，全部为 `active`；可用余额为 `65000` Credits，Stripe Event Processing Error 为 `0`。

脱敏证据见 [`real-integration/phase8-stripe-2026-08-16t000000000z.json`](real-integration/phase8-stripe-2026-08-16t000000000z.json)。不提交密钥、Webhook Signing Secret、邮箱、Checkout Session URL 或未脱敏 Stripe CLI 截图。未授权 Stripe Live Mode；该结果只适用于 Sandbox/Test。
