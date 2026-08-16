# Phase 12 Testing Evidence

执行日期：2026-08-16  
范围：仅收口测试、CI 与证据；不扩展 Candidate M 已冻结需求。

## 本轮可重复结果

| Layer                         | Command / Environment                                              | Result | Evidence                                                                                              |
| ----------------------------- | ------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------- |
| Format                        | `pnpm format`                                                      | PASS   | Prettier check exit 0                                                                                 |
| Lint                          | `pnpm lint`                                                        | PASS   | ESLint exit 0                                                                                         |
| Typecheck                     | `pnpm typecheck`                                                   | PASS   | `tsc --noEmit` exit 0                                                                                 |
| Unit / integration / contract | `pnpm test`                                                        | PASS   | Vitest 30 files / 69 tests passed                                                                     |
| Production build              | `NEXT_DIST_DIR=.phase12-next pnpm build`                           | PASS   | Next 16.3.1 generated `.phase12-next/BUILD_ID`                                                        |
| Browser E2E                   | `pnpm test:e2e`                                                    | PASS   | 16 Chromium production scenarios passed, including responsive, keyboard, axe, media and Account Guard |
| Real Account E2E              | `PHASE11_ACCOUNT_VISUAL=1 node scripts/phase11-account-visual.mjs` | PASS   | Controlled Supabase user created, authenticated, Account rendered and user deleted in `finally`       |
| Dependency security           | `pnpm audit --prod --audit-level=high`                             | PASS   | No known vulnerabilities found                                                                        |

The bare `pnpm build` command encountered `EBUSY` while cleaning an existing `.next/phase9-keyboard-chrome-*` Chrome profile. No source compilation error was reported. The repository already supports `NEXT_DIST_DIR` for isolated production output; the isolated build above and the E2E script's independent production build both passed. The locked shared directory was not removed and no user browser process was terminated.

## Test Layer Mapping

| Layer                                       | Coverage                                                                                               | Result                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Unit                                        | Domain state, request hashing, pricing, validation, config, typed content and SEO helpers              | PASS via Vitest                                                  |
| Integration                                 | Proxy guards, repositories, generation and webhook processing boundaries                               | PASS via Vitest; remote Supabase Credits evidence retained below |
| Contract                                    | Supabase migrations, fal adapter/webhook/config and Stripe product/webhook/config contracts            | PASS via Vitest                                                  |
| E2E                                         | Production Chromium public routes, responsive behavior, keyboard interaction, axe and Account boundary | PASS                                                             |
| Real integration                            | Owned Supabase Account in this run; Google, fal and Stripe use the separate historical evidence below  | PASS / retained evidence                                         |
| Security                                    | Dependency advisory scan                                                                               | PASS                                                             |
| Hosted CI / full secret scan / license scan | Not triggered or not configured                                                                        | NOT EXECUTED                                                     |

## Isolated Fixtures And Stubs

`pnpm test` uses isolated fakes and fixtures only for deterministic unit, integration and contract boundaries. These include fal queue/status responses and Stripe webhook/event payloads. They do not invoke a provider, create a checkout, issue Credits, create a real generation task, or establish a Google session. The production application has no fake-provider configuration path.

## Real Provider Evidence

| Provider     | Environment                       | Scope                                                                    | Status                                        | Separate evidence                                                |
| ------------ | --------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------- |
| Google OAuth | Project-controlled test user      | Consent, callback, provider identity                                     | PASS (2026-08-15; not rerun in Phase 12)      | `docs/test-cases.md` A4-008 / A-002                              |
| fal          | Real account with explicit budget | Text-to-image, image-to-video, text-to-speech, webhook and replay        | PASS (2026-08-15; not rerun, no new AI cost)  | `docs/real-integration/phase6-real-2026-08-15t080854324z.json`   |
| Stripe       | Sandbox / Test                    | Subscription, recurring pack, cancel, decline, 3DS, bank/link and replay | PASS (2026-08-16; not rerun, no new checkout) | `docs/real-integration/phase8-stripe-2026-08-16t000000000z.json` |
| Supabase     | Project-controlled test user      | Login and Account rendering                                              | PASS (2026-08-16)                             | This record and T12-004                                          |

## Explicitly Not Executed

- GitHub Actions has been defined in `.github/workflows/quality.yml`, but no hosted workflow run occurred in this phase.
- A repeat Google OAuth consent/cancel/error run was not automated or rerun.
- fal and Stripe real flows were not rerun because they respectively consume AI budget or create new Sandbox transactions; the valid prior evidence is retained separately.
- A reproducible full-repository secret scanner and license scanner are not configured. `pnpm licenses list` could not run because the local pnpm package index is incomplete, so this is not treated as a pass.
