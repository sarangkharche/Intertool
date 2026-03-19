import { createHmac } from "node:crypto";
import type { Skill } from "./types";
import type { RegistrySettings } from "./settings";

type WebhookEvent = "publish" | "update" | "delete";

interface WebhookPayload {
  event: WebhookEvent;
  skill: Pick<Skill, "slug" | "name" | "type" | "author" | "version">;
  timestamp: string;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function fireWebhook(
  settings: RegistrySettings,
  event: WebhookEvent,
  skill: Skill
): void {
  const url = settings.webhook_url;
  if (!url) return;

  const events = settings.webhook_events ?? ["publish", "update", "delete"];
  if (!events.includes(event)) return;

  const payload: WebhookPayload = {
    event,
    skill: {
      slug: skill.slug,
      name: skill.name,
      type: skill.type,
      author: skill.author,
      version: skill.version,
    },
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);
  const secret = process.env.WEBHOOK_SECRET ?? settings.webhook_url ?? "";
  const signature = sign(body, secret);

  // Fire-and-forget
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
      "X-Webhook-Event": event,
    },
    body,
    signal: AbortSignal.timeout(10000),
  }).catch(() => {});
}
