# AI Generation

状态：**已完成；默认与备选模型均已通过 Provider 验证，模型选择、价格映射和 Webhook 模型透传已实现。**

## 已实现边界

- Server-only `@fal-ai/client` Queue Adapter；浏览器不接触 `FAL_KEY`。
- 当前注册的 endpoint 与对应最小输入契约：

| Modality      | Model ID                                          | Server model key                         | Input                                                                 |
| ------------- | ------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| Text → Image  | `fal-ai/flux/schnell`                             | `fal.flux.schnell`                       | 用户原始 `prompt`、可选 `imageSize`                                   |
| Text → Image  | `fal-ai/flux/dev`                                 | `fal.flux.dev`                           | 用户原始 `prompt`、可选 `imageSize`                                   |
| Image → Image | `fal-ai/flux/dev/image-to-image`                  | `fal.flux.dev.image_to_image`            | HTTPS `image_url`、用户原始 `prompt`、`strength`                      |
| Image → Video | `fal-ai/kling-video/v2.1/standard/image-to-video` | `fal.kling.v2_1.standard.image_to_video` | HTTPS `imageUrl`、`prompt`、可选 `duration`                           |
| Image → Video | `fal-ai/kling-video/v3/standard/image-to-video`   | `fal.kling.v3.standard.image_to_video`   | HTTPS `start_image_url`、`prompt`、`duration`、`generate_audio=false` |
| Text → Speech | `fal-ai/minimax/speech-02-hd`                     | `fal.minimax.speech_02_hd`               | `text`、可选 `voiceId`                                                |
| Text → Speech | `fal-ai/minimax/speech-2.8-turbo`                 | `fal.minimax.speech_2_8_turbo`           | `prompt`、可选 `voiceId`                                              |

这些 endpoint 是从已锁定的官方 `@fal-ai/client@1.10.1` 类型清单中选定，并于 2026-08-15 各完成一次真实调用。Result URL、External Task ID 与 Webhook Receipt 保存在 `docs/real-integration/phase6-real-2026-08-15t080854324z.json`。

`POST /api/uploads/image` 仅允许已登录用户上传 JPEG、PNG 或 WebP，最大 10 MiB；实际上传使用 fal Storage，并以 `media_assets` metadata 记录 Provider URL。上传或 metadata 记录任一失败时 API 返回错误，不返回本地伪造 URL。

Adapter 使用 fal Queue 的 `submit`、`status` 和 `result`；根据 `modelKey` 选择 Provider payload adapter。当前接入模型原生接受中文/CJK 文本时直接透传用户原始 Prompt，不再使用有限关键词翻译；任务、Quote、Provider payload 和 Result 通过同一 `modelKey` 与 request hash 关联。Kling V3 显式发送 `generate_audio=false`，避免改变产品默认行为。没有轮询或回调能把本地任务直接伪造成成功。

`finalize_fal_webhook_event` 保存的 `generation_tasks.result_reference` 是唯一的用户结果来源。Studio 通过登录会话和 `GET /api/generations/[taskId]` 轮询当前任务并渲染已持久化的 HTTPS 媒体；Account 的最近任务使用相同 Result Reference。读取端点只接受任务 UUID，并依赖现有 `generation_tasks_select_own` RLS，因此不会通过任务 ID 向其他用户泄露结果。

## Webhook 与结算

fal Queue submit 将 `FAL_WEBHOOK_TOKEN` 追加到已配置的 HTTPS `FAL_WEBHOOK_URL`。`POST /api/webhooks/fal` 对该 token 作常量时间比较并读取原始 body 的 SHA-256。当前代码调用 `get_fal_webhook_context` 与 `finalize_fal_webhook_event`，在同一事务保存 receipt 并最终化 Credits。

`202608150002_phase6_fal_lifecycle.sql` 创建不可重复的 `(provider_key, external_task_id, payload_hash)` Webhook receipt，并写出 `generation.fal_webhook_received` Outbox Event。相同 payload 重放只返回 replay；未知 external task 或数据库不可用返回失败，不静默丢弃。

Webhook callback 不直接把 `generation_tasks` 修改为 `succeeded`，也不直接写 Ledger。`finalize_fal_webhook_event` 在同一事务消费 receipt、映射 result、执行 Settle 或 Compensation，并完成最终状态转换。

## 配置与验证

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

还需要公开可达的 HTTPS Webhook URL、已应用数据库迁移、每个模型的账户访问权和明确的费用预算。Provider 验证应对每种模态提交受控的低成本请求，并记录 Model ID、External Task ID（脱敏）、终态、Result Reference 和 Provider Cost；不在常规单元测试中自动调用真实 Provider。

截至 2026-08-18，默认模型以及 Flux Dev、Flux Dev Image-to-Image、Kling V3（5 秒、无音频）和 MiniMax Speech 2.8 Turbo 均已完成低成本 Provider 验证，证据见 `docs/real-integration/multimodel-2026-08-18.json`。调用均返回 `COMPLETED` 和 HTTPS Result，预计累计 Provider 费用约 `$0.8216`，低于 `$5` 上限。价格迁移 `202608180001_multimodel_prices.sql` 已应用到目标 Supabase，备选模型可进入真实 Quote/Generate。

`generation_tasks` Transition Trigger 已由 `202608150003_fix_generation_task_transition_trigger.sql` 修复，现有 External Task/Result 可复用，不会重复提交 Image。fal Usage Dashboard 显示 Kling `$0.28`、Minimax `$0.0036`、Flux `$0.003`，明细合计 `$0.2866`，页面四舍五入显示 `$0.29`；低于 `$5` 授权上限和约 `$0.56` 保守估算。本地 Credits Effect 为 `0`，账单截图见 `docs/real-integration/phase6-fal-usage.png`。
