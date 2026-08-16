# Authentication 配置与验收

状态：**Phase 4 生产路径与核心真实 Provider E2E 已通过**  
日期：**2026-08-15**

## 1. 已实现路径

- Supabase `@supabase/ssr` Cookie Session 与 Next.js 16 Root Proxy Token Refresh；
- Email/Password Register、Login、当前设备 Logout；
- Google OAuth PKCE 发起与 `/auth/callback` Code Exchange；
- `/account` 页面与 `/api/generate` API 的服务端身份校验；
- 游客可进入 `/studio`，Generate 前进入登录；
- OAuth Cancel/Callback Failure、Session Expired、Invalid Credential、Duplicate Email、Rate Limit 与 Provider Unavailable 的安全错误状态；
- Callback `next` 参数只允许站内绝对路径，防止开放重定向；
- Phase 4 不使用也不需要 Supabase Service Role Key。

## 2. 本地环境变量

复制 `.env.example` 为不提交 Git 的 `.env.local`，填写：

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

旧 Supabase 项目可暂用 `NEXT_PUBLIC_SUPABASE_ANON_KEY`；如果两者同时存在，应用优先使用 Publishable Key。Publishable/Anon Key 用于受 RLS 约束的浏览器与 SSR 请求，不得用 Service Role Key 替代。

## 3. Supabase Dashboard

1. 在 Authentication → Providers 启用 Email 与 Google。
2. 在 URL Configuration 设置 Site URL。
3. 将本地与生产应用 Callback 加入 Redirect Allow List：
   - `http://localhost:3000/auth/callback`
   - `https://<production-domain>/auth/callback`
4. 按产品策略决定是否启用 Confirm Email；应用同时支持“注册后直接有 Session”和“先完成邮件确认”两种返回。

## 4. Google Auth Platform

1. 创建 Web Application OAuth Client。
2. 配置 Consent Screen/Audience，并保留最小 `openid`、email、profile Scopes。
3. Authorized JavaScript Origins 加入应用本地与生产 Origin。
4. Authorized Redirect URIs 填写 Supabase Dashboard 的 Google Provider Callback URL，通常为：

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

5. 将 Google Client ID 与 Client Secret 只填写到 Supabase Google Provider 配置，不写入本仓库。

参考：[Supabase SSR Client](https://supabase.com/docs/guides/auth/server-side/nextjs)、[Supabase Google Login](https://supabase.com/docs/guides/auth/social-login/auth-google)。

## 5. 真实验收清单

使用项目所有者控制的测试邮箱和 Google Test User，逐项记录时间与脱敏 User/Identity ID：

1. Email Register → 必要时 Confirm Email → Login → 刷新后 Session 保持；
2. 退出当前会话后 `/account` 重定向 Login，`POST /api/generate` 返回 `401`；
3. Google Consent → Callback → `/account` 显示 Google Provider；
4. Google Cancel、无效/重复 Callback Code 与过期 Session 显示安全错误；
5. 已登录访问 `/login`、`/register` 自动回到安全的 `next` 路径；
6. `next=//external.example` 不会跳出本站。

2026-08-15 已使用项目所有者控制的测试邮箱与 Google Test User，在本地 Production Server 完成 Email Register/Confirm/Login/Session Persistence/Local Logout、Google Consent/Callback/Provider Identity，以及 Guest Studio/Generate API Guard 验收。Credential、Cookie、Token、User ID 与 Client Secret 均未写入本仓库。

Google Cancel、无效/重复 Callback Code 与同邮箱 Identity Collision 的真实 E2E 尚未执行；这些边界仍保持 `NOT EXECUTED`，不能由已通过的成功路径替代。
