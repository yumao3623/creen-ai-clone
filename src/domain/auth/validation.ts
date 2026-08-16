import type { AuthError } from "@supabase/supabase-js";

export type AuthActionState = Readonly<{
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Readonly<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>;
}>;

export const initialAuthActionState: AuthActionState = { status: "idle" };

export function validateCredentials(
  formData: FormData,
  isRegistration: boolean,
) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const fieldErrors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  } = {};

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    fieldErrors.email = "请输入有效邮箱地址。";
  }

  if (password.length < 8) {
    fieldErrors.password = "密码至少需要 8 个字符。";
  }

  if (isRegistration && password !== confirmPassword) {
    fieldErrors.confirmPassword = "两次输入的密码不一致。";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false as const, fieldErrors };
  }

  return { ok: true as const, email, password };
}

const authErrorMessages: Readonly<Record<string, string>> = {
  invalid_credentials: "邮箱或密码不正确。",
  email_not_confirmed: "请先完成邮箱确认后再登录。",
  user_already_exists: "该邮箱已注册，请直接登录。",
  email_exists: "该邮箱已注册，请直接登录。",
  weak_password: "密码强度不足，请使用更长且更难猜的密码。",
  signup_disabled: "当前项目暂未开放邮箱注册。",
  provider_disabled: "Google 登录尚未在 Supabase 项目中启用。",
  over_email_send_rate_limit: "邮件发送过于频繁，请稍后重试。",
  over_request_rate_limit: "请求过于频繁，请稍后重试。",
  validation_failed: "提交内容无效，请检查后重试。",
};

export function authErrorMessage(error: Pick<AuthError, "code">) {
  return (
    (error.code ? authErrorMessages[error.code] : undefined) ??
    "认证服务暂时无法完成请求，请稍后重试。"
  );
}
