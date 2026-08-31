import { Environment, LogLevel, Paddle, type EventEntity } from "@paddle/paddle-node-sdk";
import { getBillingEnvironment } from "@/lib/server/billing-environment";

let cachedPaddle: Paddle | undefined;

export function getPaddleInstance() {
  if (!cachedPaddle) {
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) throw new Error("PADDLE_API_KEY is not set");
    cachedPaddle = new Paddle(apiKey, {
      environment: getBillingEnvironment() === "live" ? Environment.production : Environment.sandbox,
      logLevel: LogLevel.error,
    });
  }
  return cachedPaddle;
}

export function getPaddleWebhookSecret() {
  const secret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET;
  if (!secret) throw new Error("PADDLE_NOTIFICATION_WEBHOOK_SECRET is not set");
  return secret;
}

export type PaddleEvent = EventEntity & {
  eventType: string;
  eventId: string;
  occurredAt?: string;
  data: Record<string, unknown>;
};
