import "server-only";

import Stripe from "stripe";

import { getStripeServerConfig } from "@/integrations/stripe/config";

export function createStripeClient() {
  const config = getStripeServerConfig();
  return new Stripe(config.secretKey, {
    appInfo: { name: "creen-ai-clone", version: "0.1.0" },
    maxNetworkRetries: 2,
    timeout: 20_000,
  });
}
