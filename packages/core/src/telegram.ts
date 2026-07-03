import { z } from "zod";

/**
 * Minimal Telegram Bot API shapes used by the optional gateway.
 * These schemas intentionally accept unknown extra fields because Telegram
 * updates evolve over time and the gateway only consumes a tiny text-command subset.
 */

const safeIntegerSchema = z.number().int().refine(Number.isSafeInteger, "expected a safe integer");

const nonNegativeSafeIntegerSchema = safeIntegerSchema.refine(
  (value) => value >= 0,
  "expected a non-negative integer",
);

const nullableTelegramUsernameSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .nullish()
  .transform((value) => value ?? null);

const optionalTrimmedSecretSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .min(1)
    .nullish()
    .transform((value) => value ?? null),
);

export const telegramChatTypeSchema = z.enum(["private", "group", "supergroup", "channel"]);
export type TelegramChatType = z.infer<typeof telegramChatTypeSchema>;

export const telegramUserSchema = z
  .object({
    id: nonNegativeSafeIntegerSchema,
    is_bot: z.boolean(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    username: z.string().optional(),
    language_code: z.string().optional(),
  })
  .passthrough();
export type TelegramUser = z.infer<typeof telegramUserSchema>;

export const telegramChatSchema = z
  .object({
    id: safeIntegerSchema,
    type: telegramChatTypeSchema,
    title: z.string().optional(),
    username: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
  })
  .passthrough();
export type TelegramChat = z.infer<typeof telegramChatSchema>;

export const telegramMessageSchema = z
  .object({
    message_id: nonNegativeSafeIntegerSchema,
    date: nonNegativeSafeIntegerSchema,
    from: telegramUserSchema.optional(),
    chat: telegramChatSchema,
    text: z.string().optional(),
    caption: z.string().optional(),
  })
  .passthrough();
export type TelegramMessage = z.infer<typeof telegramMessageSchema>;

export const telegramUpdateSchema = z
  .object({
    update_id: nonNegativeSafeIntegerSchema,
    message: telegramMessageSchema.optional(),
    edited_message: telegramMessageSchema.optional(),
  })
  .passthrough();
export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;

export const telegramCommandNameSchema = z.enum(["start", "help", "status", "visit", "unknown"]);
export type TelegramCommandName = z.infer<typeof telegramCommandNameSchema>;

export const telegramGatewayCommandSchema = z.object({
  source: z.literal("telegram"),
  updateId: nonNegativeSafeIntegerSchema,
  messageId: nonNegativeSafeIntegerSchema,
  chatId: safeIntegerSchema,
  chatType: telegramChatTypeSchema,
  telegramUserId: nonNegativeSafeIntegerSchema.nullable(),
  username: nullableTelegramUsernameSchema,
  text: z.string().trim().min(1).max(4096),
  command: telegramCommandNameSchema,
  args: z.string().trim().max(4000),
  receivedAt: z.string().datetime(),
});
export type TelegramGatewayCommand = z.infer<typeof telegramGatewayCommandSchema>;

export const telegramWebhookSecretSchema = z
  .string()
  .trim()
  .min(16)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/, "Telegram webhook secret may contain only A-Z, a-z, 0-9, _ and -");
export type TelegramWebhookSecret = z.infer<typeof telegramWebhookSecretSchema>;

export const telegramGatewayRuntimeConfigSchema = z.object({
  webhookSecret: telegramWebhookSecretSchema,
  gatewayApiUrl: z.string().trim().url(),
  gatewayApiToken: z.string().trim().min(16),
  botToken: optionalTrimmedSecretSchema,
});
export type TelegramGatewayRuntimeConfig = z.infer<typeof telegramGatewayRuntimeConfigSchema>;

export const telegramGatewayApiResponseSchema = z.object({
  ok: z.boolean(),
  message: z.string().trim().min(1).max(1000).optional(),
});
export type TelegramGatewayApiResponse = z.infer<typeof telegramGatewayApiResponseSchema>;

export function parseTelegramCommandText(text: string): {
  command: TelegramCommandName;
  args: string;
} {
  const trimmed = text.trim();

  if (!trimmed.startsWith("/")) {
    return { command: "unknown", args: trimmed };
  }

  const [rawCommand = "", ...argParts] = trimmed.split(/\s+/);
  const commandName = (rawCommand.slice(1).split("@").at(0) ?? "").toLowerCase();
  const args = argParts.join(" ").trim();
  const commandResult = telegramCommandNameSchema.safeParse(commandName);

  if (commandResult.success && commandResult.data !== "unknown") {
    return { command: commandResult.data, args };
  }

  return { command: "unknown", args };
}

export function getTelegramUpdateMessage(update: TelegramUpdate): TelegramMessage | null {
  return update.message ?? update.edited_message ?? null;
}

export function buildTelegramGatewayCommand(
  update: TelegramUpdate,
  receivedAt = new Date(),
): TelegramGatewayCommand | null {
  const message = getTelegramUpdateMessage(update);
  const text = message?.text?.trim();

  if (!message || !text) {
    return null;
  }

  const parsedCommand = parseTelegramCommandText(text);

  return telegramGatewayCommandSchema.parse({
    source: "telegram",
    updateId: update.update_id,
    messageId: message.message_id,
    chatId: message.chat.id,
    chatType: message.chat.type,
    telegramUserId: message.from?.id ?? null,
    username: message.from?.username ?? null,
    text,
    command: parsedCommand.command,
    args: parsedCommand.args,
    receivedAt: receivedAt.toISOString(),
  });
}
