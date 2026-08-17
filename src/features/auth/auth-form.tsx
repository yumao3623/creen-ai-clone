"use client";

import Link from "next/link";
import { useActionState } from "react";

import { initialAuthActionState } from "@/domain/auth/validation";
import {
  googleLoginAction,
  loginAction,
  registerAction,
} from "@/features/auth/actions";

type AuthFormProps = Readonly<{
  mode: "login" | "register";
  nextPath: string;
  notice: { tone: "error" | "success"; message: string } | undefined;
}>;

export function AuthForm({ mode, nextPath, notice }: AuthFormProps) {
  const isRegistration = mode === "register";
  const [state, action, isPending] = useActionState(
    isRegistration ? registerAction : loginAction,
    initialAuthActionState,
  );

  return (
    <div className="auth-panel">
      <div className="auth-panel__top">
        <Link className="auth-brand" href="/" aria-label="返回 Creen 首页">
          <span aria-hidden="true">C</span>
          Creen
        </Link>
        <Link aria-label="关闭并返回首页" className="auth-close" href="/">
          ×
        </Link>
      </div>
      <div className="auth-panel__heading">
        <p className="eyebrow">{isRegistration ? "注册" : "欢迎回来"}</p>
        <h1>{isRegistration ? "创建账户" : "登录"}</h1>
        <p>
          {isRegistration
            ? "使用邮箱和密码注册，或通过 Google 继续。"
            : "恢复你的安全会话并继续进入创作工作区。"}
        </p>
      </div>

      {notice ? (
        <p
          className={`form-message form-message--${notice.tone}`}
          role="status"
        >
          {notice.message}
        </p>
      ) : null}

      <form action={googleLoginAction}>
        <input name="next" type="hidden" value={nextPath} />
        <button className="button button--google" type="submit">
          <span aria-hidden="true">G</span>
          使用 Google 继续
        </button>
      </form>

      <div className="auth-divider">
        <span>或使用邮箱</span>
      </div>

      <form action={action} className="auth-form" noValidate>
        <input name="next" type="hidden" value={nextPath} />

        <label className="field">
          <span>邮箱</span>
          <input
            aria-describedby={
              state.fieldErrors?.email ? "email-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.email)}
            autoComplete="email"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
          {state.fieldErrors?.email ? (
            <small className="field__error" id="email-error">
              {state.fieldErrors.email}
            </small>
          ) : null}
        </label>

        <label className="field">
          <span>密码</span>
          <input
            aria-describedby={
              state.fieldErrors?.password ? "password-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.password)}
            autoComplete={isRegistration ? "new-password" : "current-password"}
            minLength={8}
            name="password"
            required
            type="password"
          />
          {state.fieldErrors?.password ? (
            <small className="field__error" id="password-error">
              {state.fieldErrors.password}
            </small>
          ) : null}
        </label>

        {isRegistration ? (
          <label className="field">
            <span>确认密码</span>
            <input
              aria-describedby={
                state.fieldErrors?.confirmPassword
                  ? "confirm-password-error"
                  : undefined
              }
              aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
              autoComplete="new-password"
              minLength={8}
              name="confirmPassword"
              required
              type="password"
            />
            {state.fieldErrors?.confirmPassword ? (
              <small className="field__error" id="confirm-password-error">
                {state.fieldErrors.confirmPassword}
              </small>
            ) : null}
          </label>
        ) : null}

        {state.message ? (
          <p
            className={`form-message form-message--${state.status === "success" ? "success" : "error"}`}
            role="status"
          >
            {state.message}
          </p>
        ) : null}

        <button
          className="button button--primary"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "正在提交…" : isRegistration ? "注册" : "登录"}
        </button>
      </form>

      <p className="auth-panel__switch">
        {isRegistration ? "已有账户？" : "还没有账户？"}{" "}
        <Link
          href={`${isRegistration ? "/login" : "/register"}?next=${encodeURIComponent(nextPath)}`}
        >
          {isRegistration ? "直接登录" : "创建账户"}
        </Link>
      </p>
    </div>
  );
}
