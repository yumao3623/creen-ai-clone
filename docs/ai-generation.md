# AI Generation

状态：**PASS；Phase 6 代码、隔离契约测试、远端 Webhook 与三个真实 fal 请求均已完成。**

## 已实现边界

- Server-only `@fal-ai/client` Queue Adapter；浏览器不接触 `FAL_KEY`。
- 三个固定 endpoint 与对应最小输入契约：

| Modality      | Model ID                                          | Server model key                         | Input                                       |
| ------------- | ------------------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| Text → Image  | `fal-ai/flux/schnell`                             | `fal.flux.schnell`                       | `prompt`、可选 `imageSize`                  |
| Image → Video | `fal-ai/kling-video/v2.1/standard/image-to-video` | `fal.kling.v2_1.standard.image_to_video` | HTTPS `imageUrl`、`prompt`、可选 `duration` |
| Text → Speech | `fal-ai/minimax/speech-02-hd`                     | `fal.minimax.speech_02_hd`               | `text`、可选 `voiceId`                      |

这些 endpoint 是从已锁定的官方 `@fal-ai/client@1.10.1` 类型清单中选定，并于 2026-08-15 各完成一次真实调用。Result URL、External Task ID 与 Webhook Receipt 保存在 `docs/real-integration/phase6-real-2026-08-15t080854324z.json`。

`POST /api/uploads/image` 仅允许已登录用户上传 JPEG、PNG 或 WebP，最大 10 MiB；实际上传使用 fal Storage，并以 `media_assets` metadata 记录 Provider URL。上传或 metadata 记录任一失败时 API 返回错误，不返回本地伪造 URL。

Adapter 使用 fal Queue 的 `submit`、`status` 和 `result`；对账只在 fal 报告 `COMPLETED` 后读取并映射 HTTPS Image/Video/Audio Result URL。没有轮询或回调能把本地任务直接伪造成成功。

## Webhook 与结算边界

fal Queue submit 将 `FAL_WEBHOOK_TOKEN` 追加到已配置的 HTTPS `FAL_WEBHOOK_URL`。`POST /api/webhooks/fal` 对该 token 作常量时间比较并读取原始 body 的 SHA-256。远端尚未应用 Phase 7 时调用 Phase 6 的 `record_fal_webhook_event`；应用 Phase 7 后，当前代码调用 `get_fal_webhook_context` 与 `finalize_fal_webhook_event`，在同一事务保存 receipt 并最终化 Credits。

`202608150002_phase6_fal_lifecycle.sql` 创建不可重复的 `(provider_key, external_task_id, payload_hash)` Webhook receipt，并写出 `generation.fal_webhook_received` Outbox Event。相同 payload 重放只返回 replay；未知 external task 或数据库不可用返回失败，不静默丢弃。

Phase 6 Migration 不让 callback 直接修改 `generation_tasks` 为 `succeeded`，也不写 Ledger。Phase 7 代码与 Migration 已实现同一事务消费 receipt、映射 result、执行 Settle 或 Compensation，并完成最终状态转换；远端应用 `202608150004_phase7_credits.sql` 前仍保持 Phase 6 receipt-only 行为。

## 配置与真实验收

真实调用前必须在非提交的 `.env.local` 或托管 Secret Store 提供：

```text
FAL_KEY
FAL_TEXT_TO_IMAGE_MODEL=fal-ai/flux/schnell
FAL_IMAGE_TO_VIDEO_MODEL=fal-ai/kling-video/v2.1/standard/image-to-video
FAL_TEXT_TO_SPEECH_MODEL=fal-ai/minimax/speech-02-hd
FAL_WEBHOOK_URL=https://<public-host>/api/webhooks/fal
FAL_WEBHOOK_TOKEN=<at-least-32-random-characters>
SUPABASE_SERVICE_ROLE_KEY
```

还需要公开可达的 HTTPS Webhook URL、已应用 Phase 6 Migration、每个模型的账户访问权和批准的硬预算。真实验证应对每种模态仅提交一次受控低成本请求，并记录时间、Model ID、External Task ID（脱敏）、终态、Result Reference 和 Provider Cost；不得在 `pnpm test` 或不可信分支自动运行。

2026-08-15 真实验收在 `$5` Hard Budget 下仅提交每个模态一次：Flux Schnell 返回真实 Image，Minimax Speech 02 HD 返回真实 MP3，Kling 2.1 Standard 使用该真实 Image 返回 5 秒 MP4。三个请求均为 `COMPLETED`，三个公开 HTTPS callback 均落入远端 `provider_webhook_events`；使用原 payload hash 重放后全部返回 `was_replayed=true`，事件总数仍为 3。

首次 Image 请求暴露了 `generation_tasks` Transition Trigger 调用另一个 trigger-only function 的数据库缺陷。`202608150003_fix_generation_task_transition_trigger.sql` 修复后复用了既有 External Task/Result，没有第二次提交 Image。fal Usage Dashboard 显示 Kling `$0.28`、Minimax `$0.0036`、Flux `$0.003`，明细合计 `$0.2866`，页面四舍五入显示 `$0.29`；低于 `$5` 授权上限和约 `$0.56` 保守估算。本地 Credits Effect 为 `0`，账单截图见 `docs/real-integration/phase6-fal-usage.png`。
