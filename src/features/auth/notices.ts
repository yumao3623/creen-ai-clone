const errorMessages: Readonly<Record<string, string>> = {
  authentication_required: "请先登录后再访问该页面。",
  session_expired: "你的会话已过期，请重新登录。",
  auth_unavailable: "认证服务尚未配置，当前无法登录。",
  google_unavailable: "Google 登录当前不可用，请稍后重试或使用邮箱登录。",
  oauth_cancelled: "Google 登录已取消，你可以重新尝试。",
  oauth_callback_failed: "无法完成 Google 登录，请重新尝试。",
};

const noticeMessages: Readonly<Record<string, string>> = {
  signed_out: "你已安全退出当前设备上的会话。",
};

export function authPageNotice(error?: string, notice?: string) {
  if (error && errorMessages[error]) {
    return { tone: "error" as const, message: errorMessages[error] };
  }

  if (notice && noticeMessages[notice]) {
    return { tone: "success" as const, message: noticeMessages[notice] };
  }

  return undefined;
}
