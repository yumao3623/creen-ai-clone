export const protectedPagePrefixes = ["/account", "/checkout/return"] as const;
export const protectedApiPrefixes = [
  "/api/generate",
  "/api/stripe/checkout",
] as const;

export type ProtectedAccessDecision =
  | { kind: "allow" }
  | { kind: "redirect"; destination: string }
  | { kind: "reject"; status: 401 | 503; code: string };

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPage(pathname: string) {
  return protectedPagePrefixes.some((prefix) =>
    matchesPrefix(pathname, prefix),
  );
}

export function isProtectedApi(pathname: string) {
  return protectedApiPrefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

export function safeInternalPath(value: string | null, fallback = "/account") {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function decideProtectedAccess(input: {
  pathname: string;
  isAuthenticated: boolean;
  authConfigured: boolean;
  hadAuthCookie: boolean;
}): ProtectedAccessDecision {
  if (!isProtectedPage(input.pathname) && !isProtectedApi(input.pathname)) {
    return { kind: "allow" };
  }

  if (!input.authConfigured) {
    if (isProtectedApi(input.pathname)) {
      return { kind: "reject", status: 503, code: "auth_unavailable" };
    }

    return {
      kind: "redirect",
      destination: `/login?error=auth_unavailable&next=${encodeURIComponent(input.pathname)}`,
    };
  }

  if (input.isAuthenticated) {
    return { kind: "allow" };
  }

  if (isProtectedApi(input.pathname)) {
    return { kind: "reject", status: 401, code: "authentication_required" };
  }

  const error = input.hadAuthCookie
    ? "session_expired"
    : "authentication_required";
  return {
    kind: "redirect",
    destination: `/login?error=${error}&next=${encodeURIComponent(input.pathname)}`,
  };
}
