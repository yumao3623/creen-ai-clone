# Phase 7 Credits

状态：**PASS；代码、远端 Migration、真实并发、Settlement、Compensation 与 Ledger 对账均已完成**

## 冻结价格

`production.credits.v1` 使用整数最小单位，`1 Credit = USD 0.0001` 的已验证 Provider 成本基准：

| Modality      | Model Key                                | Parameter  | Credits |                     Provider Cost Basis |
| ------------- | ---------------------------------------- | ---------- | ------: | --------------------------------------: |
| Text → Image  | `fal.flux.schnell`                       | `default`  |      30 |                               USD 0.003 |
| Image → Video | `fal.kling.v2_1.standard.image_to_video` | 5 秒       |   2,800 |                                USD 0.28 |
| Image → Video | `fal.kling.v2_1.standard.image_to_video` | 10 秒      |   5,600 | USD 0.56，按已验证 5 秒成本保守线性推导 |
| Text → Speech | `fal.minimax.speech_02_hd`               | 每 10 字符 |       6 |                    USD 0.0006 / 10 字符 |

价格来自 Phase 6 的真实 fal Usage Evidence。Phase 7 不增加会员折扣、优惠券、Trial、退款、税务或多币种规则。

## 事务边界

`202608150004_phase7_credits.sql` 实现：

- `create_generation_quote`：使用当前生产 Price Version 生成 15 分钟不可变 Quote；
- `submit_generation_task`：在同一事务锁定 Idempotency、Credit Account 和 Lots，创建 Task/Reservation/Allocation/Ledger/Outbox；
- Lot 顺序固定为 Subscription、recurring Credit Pack、Manual Adjustment；
- `record_generation_provider_submission`：只有预留完成后才把真实 fal External Task 持久化为 `queued`；
- `finalize_fal_webhook_event`：同一事务保存原始 Receipt，并执行成功结算或失败补偿；
- 精确 callback replay 不重复结算；不同的晚到终态只保留 Evidence，不覆盖已完成的可信终态；
- Provider 已接受但本地提交记录失败时进入 `reconciliation_required`，不错误退款。

预留时 Ledger 追加 `generation.reserve` Debit，同时把 Account 的 available 移到 reserved。成功时只清除 reserved；失败时恢复原 Lot，并追加 `generation.compensation` Credit。Ledger 历史不会更新或删除。

## API

- `POST /api/quotes`：已认证用户提交标准 Generation Input，返回 Quote ID、确定 Credits、Price Version 与 Expiry；
- `POST /api/generate`：要求 `clientKey`、`quoteId` 和同一标准 Input；余额不足返回 `409 insufficient_credits`，且不会调用 fal；
- `POST /api/webhooks/fal`：验证 callback token、映射 Result，然后调用原子最终化 RPC。

Studio 当前只为既有 Text → Image Foundation 增加“获取报价 → Generate”最小交互。三模态完整 Studio、History 和 Credits 页面仍属于 Phase 9。

## 应用与验证

按 migration history 应用 `202608150004_phase7_credits.sql` 后运行：

```bash
pnpm test:real:credits
```

该脚本使用受控 Supabase 测试用户和真实 JWT，验证：

1. 确定价格与 Price Version；
2. 零余额在 Provider 调用前阻断；
3. 并发相同 Idempotency Key 只产生一个 Task/Reservation；
4. Subscription Credits 先于 Pack Credits；
5. 成功 callback 与 replay 只扣一次；
6. 失败 callback 恢复原 Lot，并保留 Debit + Compensation Ledger。

脚本不调用 fal，`providerCalls` 固定为 `0`；它只验证 Credits 数据库事务。通过后会写入 `docs/real-integration/phase7-credits-<run-id>.json`，并删除测试用户。

2026-08-16 已通过 Supabase Dashboard SQL Editor 应用 Phase 7 Migration 与 Digest Search Path Repair，并执行真实 Supabase 验收。Evidence 为 `docs/real-integration/phase7-credits-2026-08-15t164751872z.json`；`providerCalls=0`，未产生新的 fal 费用。
