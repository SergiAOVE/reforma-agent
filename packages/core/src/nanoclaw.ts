import { z } from "zod";

/**
 * Optional NanoClaw gateway contract.
 * NanoClaw stays outside the core product runtime: it sends normalized JSON to
 * first-party server APIs, and those APIs decide what is allowed.
 */

const optionalExternalIdSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .min(1)
    .max(180)
    .nullish()
    .transform((value) => value ?? null),
);

export const nanoclawCommandNameSchema = z.enum([
  "help",
  "status",
  "visit",
  "issue",
  "decision",
  "weekly_summary",
  "unknown",
]);
export type NanoclawCommandName = z.infer<typeof nanoclawCommandNameSchema>;

export const nanoclawWebhookEventSchema = z
  .object({
    eventId: optionalExternalIdSchema,
    agentGroupId: optionalExternalIdSchema,
    conversationId: optionalExternalIdSchema,
    senderId: optionalExternalIdSchema,
    text: z.string().trim().min(1).max(8000),
    metadata: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .passthrough();
export type NanoclawWebhookEvent = z.infer<typeof nanoclawWebhookEventSchema>;

export const nanoclawGatewayCommandSchema = z.object({
  source: z.literal("nanoclaw"),
  eventId: optionalExternalIdSchema,
  agentGroupId: optionalExternalIdSchema,
  conversationId: optionalExternalIdSchema,
  senderId: optionalExternalIdSchema,
  text: z.string().trim().min(1).max(8000),
  command: nanoclawCommandNameSchema,
  args: z.string().trim().max(7900),
  metadata: z.record(z.string(), z.unknown()),
  receivedAt: z.string().datetime(),
});
export type NanoclawGatewayCommand = z.infer<typeof nanoclawGatewayCommandSchema>;

export const nanoclawGatewayRuntimeConfigSchema = z.object({
  webhookToken: z.string().trim().min(16),
  gatewayApiUrl: z.string().trim().url(),
  gatewayApiToken: z.string().trim().min(16),
});
export type NanoclawGatewayRuntimeConfig = z.infer<typeof nanoclawGatewayRuntimeConfigSchema>;

export const nanoclawGatewayApiResponseSchema = z.object({
  ok: z.boolean(),
  message: z.string().trim().min(1).max(1000).optional(),
});
export type NanoclawGatewayApiResponse = z.infer<typeof nanoclawGatewayApiResponseSchema>;

export function parseNanoclawCommandText(text: string): {
  command: NanoclawCommandName;
  args: string;
} {
  const trimmed = text.trim();

  if (!trimmed.startsWith("/")) {
    return { command: "unknown", args: trimmed };
  }

  const [rawCommand = "", ...argParts] = trimmed.split(/\s+/);
  const commandName = rawCommand.slice(1).toLowerCase().replace(/-/g, "_");
  const args = argParts.join(" ").trim();
  const commandResult = nanoclawCommandNameSchema.safeParse(commandName);

  if (commandResult.success && commandResult.data !== "unknown") {
    return { command: commandResult.data, args };
  }

  return { command: "unknown", args };
}

export function buildNanoclawGatewayCommand(
  event: NanoclawWebhookEvent,
  receivedAt = new Date(),
): NanoclawGatewayCommand {
  const parsedCommand = parseNanoclawCommandText(event.text);

  return nanoclawGatewayCommandSchema.parse({
    source: "nanoclaw",
    eventId: event.eventId,
    agentGroupId: event.agentGroupId,
    conversationId: event.conversationId,
    senderId: event.senderId,
    text: event.text,
    command: parsedCommand.command,
    args: parsedCommand.args,
    metadata: event.metadata,
    receivedAt: receivedAt.toISOString(),
  });
}
