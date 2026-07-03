import {
  telegramGatewayApiResponseSchema,
  telegramGatewayRuntimeConfigSchema,
  type TelegramGatewayApiResponse,
  type TelegramGatewayCommand,
  type TelegramGatewayRuntimeConfig,
} from "@reforma/core";

type RuntimeEnv = Record<string, string | undefined>;

export function readTelegramGatewayConfig(
  env: RuntimeEnv = process.env,
): TelegramGatewayRuntimeConfig | null {
  const parsed = telegramGatewayRuntimeConfigSchema.safeParse({
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
    gatewayApiUrl: env.TELEGRAM_GATEWAY_API_URL,
    gatewayApiToken: env.TELEGRAM_GATEWAY_API_TOKEN,
    botToken: env.TELEGRAM_BOT_TOKEN,
  });

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function isAuthorizedTelegramWebhook(headers: Headers, webhookSecret: string): boolean {
  return headers.get("x-telegram-bot-api-secret-token") === webhookSecret;
}

export async function forwardTelegramGatewayCommand(
  config: TelegramGatewayRuntimeConfig,
  command: TelegramGatewayCommand,
): Promise<TelegramGatewayApiResponse> {
  const response = await fetch(config.gatewayApiUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.gatewayApiToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  const body = await response.json().catch((): unknown => null);
  const parsed = telegramGatewayApiResponseSchema.safeParse(body);

  if (response.ok && parsed.success) {
    return parsed.data;
  }

  if (response.ok) {
    return {
      ok: true,
      message: "Command received by reforma-agent.",
    };
  }

  return {
    ok: false,
    message: "The Telegram command was not accepted by the reforma-agent gateway.",
  };
}

export async function sendTelegramText(
  config: TelegramGatewayRuntimeConfig,
  chatId: number,
  text: string,
): Promise<void> {
  if (!config.botToken) {
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4096),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed with status ${response.status}`);
  }
}

export async function sendTelegramTextSafely(
  config: TelegramGatewayRuntimeConfig,
  chatId: number,
  text: string,
): Promise<void> {
  try {
    await sendTelegramText(config, chatId, text);
  } catch (error) {
    console.error("Failed to send Telegram response", {
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
}
