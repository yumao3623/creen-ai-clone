import { describe, expect, it } from "vitest";

import {
  authErrorMessage,
  validateCredentials,
} from "@/domain/auth/validation";

function credentials(values: Record<string, string>) {
  const formData = new FormData();
  Object.entries(values).forEach(([name, value]) => formData.set(name, value));
  return formData;
}

describe("authentication input and error policy", () => {
  it("normalizes a valid email/password submission", () => {
    expect(
      validateCredentials(
        credentials({
          email: "  USER@Example.COM ",
          password: "correct-horse",
        }),
        false,
      ),
    ).toEqual({
      ok: true,
      email: "user@example.com",
      password: "correct-horse",
    });
  });

  it("returns field-specific registration errors", () => {
    const result = validateCredentials(
      credentials({
        email: "invalid",
        password: "short",
        confirmPassword: "different",
      }),
      true,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toEqual({
        email: "请输入有效邮箱地址。",
        password: "密码至少需要 8 个字符。",
        confirmPassword: "两次输入的密码不一致。",
      });
    }
  });

  it("maps provider errors without exposing raw service details", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe(
      "邮箱或密码不正确。",
    );
    expect(authErrorMessage({ code: "unexpected_backend_detail" })).toBe(
      "认证服务暂时无法完成请求，请稍后重试。",
    );
  });
});
