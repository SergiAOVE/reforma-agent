import { describe, expect, it } from "vitest";

import {
  buildTelegramGatewayCommand,
  getTelegramUpdateMessage,
  parseTelegramCommandText,
  telegramGatewayCommandSchema,
  telegramGatewayRuntimeConfigSchema,
  telegramUpdateSchema,
  telegramWebhookSecretSchema,
} from "./telegram";

const baseUpdate = {
  update_id: 123,
  message: {
    message_id: 456,
    date: 1_782_560_000,
    from: {
      id: 7_000_000_001,
      is_bot: false,
      first_name: "Ana",
      username: "ana_owner",
    },
    chat: {
      id: 7_000_000_001,
      type: "private",
    },
    text: "/visit Kitchen inspection notes",
  },
};

describe("telegramUpdateSchema", () => {
  it("accepts the Telegram text update subset used by the gateway", () => {
    expect(telegramUpdateSchema.parse(baseUpdate)).toMatchObject({
      update_id: 123,
      message: {
        message_id: 456,
        text: "/visit Kitchen inspection notes",
      },
    });
  });

  it("rejects ids that are unsafe JavaScript integers", () => {
    expect(
      telegramUpdateSchema.safeParse({
        update_id: Number.MAX_SAFE_INTEGER + 1,
      }).success,
    ).toBe(false);
  });
});

describe("parseTelegramCommandText", () => {
  it("parses bot-addressed commands and keeps the argument text", () => {
    expect(parseTelegramCommandText("/status@ReformaAgentBot  active project")).toEqual({
      command: "status",
      args: "active project",
    });
  });

  it("returns unknown for normal text", () => {
    expect(parseTelegramCommandText("please check the kitchen")).toEqual({
      command: "unknown",
      args: "please check the kitchen",
    });
  });
});

describe("buildTelegramGatewayCommand", () => {
  it("builds a normalized first-party command payload from a text update", () => {
    const command = buildTelegramGatewayCommand(
      telegramUpdateSchema.parse(baseUpdate),
      new Date("2026-07-03T12:00:00.000Z"),
    );

    expect(command).toEqual({
      source: "telegram",
      updateId: 123,
      messageId: 456,
      chatId: 7_000_000_001,
      chatType: "private",
      telegramUserId: 7_000_000_001,
      username: "ana_owner",
      text: "/visit Kitchen inspection notes",
      command: "visit",
      args: "Kitchen inspection notes",
      receivedAt: "2026-07-03T12:00:00.000Z",
    });

    expect(telegramGatewayCommandSchema.safeParse(command).success).toBe(true);
  });

  it("returns null for media-only updates", () => {
    const update = telegramUpdateSchema.parse({
      update_id: 124,
      message: {
        message_id: 457,
        date: 1_782_560_000,
        chat: {
          id: 7_000_000_001,
          type: "private",
        },
        photo: [{ file_id: "abc", width: 640, height: 480 }],
      },
    });

    expect(buildTelegramGatewayCommand(update)).toBeNull();
    expect(getTelegramUpdateMessage(update)?.message_id).toBe(457);
  });
});

describe("telegram gateway configuration schemas", () => {
  it("accepts the optional runtime gateway configuration", () => {
    expect(
      telegramGatewayRuntimeConfigSchema.safeParse({
        webhookSecret: "Valid_secret-1234",
        gatewayApiUrl: "https://reforma.example.com/api/gateway/telegram/commands",
        gatewayApiToken: "gateway-token-123456",
        botToken: "123456:ABC",
      }).success,
    ).toBe(true);
  });

  it("normalizes an empty optional bot token to null", () => {
    expect(
      telegramGatewayRuntimeConfigSchema.parse({
        webhookSecret: "Valid_secret-1234",
        gatewayApiUrl: "https://reforma.example.com/api/gateway/telegram/commands",
        gatewayApiToken: "gateway-token-123456",
        botToken: "",
      }).botToken,
    ).toBeNull();
  });

  it("rejects weak or invalid webhook secrets", () => {
    expect(telegramWebhookSecretSchema.safeParse("short").success).toBe(false);
    expect(telegramWebhookSecretSchema.safeParse("invalid secret value").success).toBe(false);
  });
});
