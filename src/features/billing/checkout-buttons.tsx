"use client";

import { useRef, useState } from "react";

import type { StripeProductKey } from "@/integrations/stripe/config";

const products: ReadonlyArray<
  Readonly<{ key: StripeProductKey; label: string }>
> = [
  { key: "subscription", label: "订阅" },
  { key: "recurring_credit_pack", label: "周期性 Credits 包" },
];

function createClientKey() {
  return crypto.randomUUID();
}

export function CheckoutButtons() {
  const [pending, setPending] = useState<StripeProductKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientKeys = useRef<Partial<Record<StripeProductKey, string>>>({});

  async function beginCheckout(productKey: StripeProductKey) {
    setPending(productKey);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productKey,
          clientKey: (clientKeys.current[productKey] ??= createClientKey()),
        }),
      });
      const payload: unknown = await response.json();
      const url =
        payload &&
        typeof payload === "object" &&
        typeof (payload as { url?: unknown }).url === "string"
          ? (payload as { url: string }).url
          : null;
      if (!response.ok || !url) throw new Error("无法创建结账页。");
      window.location.assign(url);
    } catch {
      setError("暂时无法创建安全的 Stripe Checkout，请稍后重试。");
      setPending(null);
    }
  }

  return (
    <section
      className="billing-products"
      aria-labelledby="billing-products-title"
    >
      <div>
        <p className="eyebrow">付款</p>
        <h2 id="billing-products-title">Stripe Sandbox</h2>
        <p>付款确认后由 Stripe 签名 Webhook 更新账户和 Credits。</p>
      </div>
      <div className="billing-products__actions">
        {products.map((product) => (
          <button
            className="button button--secondary"
            disabled={pending !== null}
            key={product.key}
            onClick={() => void beginCheckout(product.key)}
            type="button"
          >
            {pending === product.key ? "正在跳转..." : product.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="form-message form-message--error">{error}</p>
      ) : null}
    </section>
  );
}
