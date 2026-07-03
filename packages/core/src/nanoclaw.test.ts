import { describe, expect, it } from "vitest";

import {
  buildNanoclawGatewayCommand,
  nanoclawGatewayCommandSchema,
  nanoclawGatewayRuntimeConfigSchema,
  nanoclawWebhookEventSchema,
  parseNanoclawCommandText,
} from "./nanoclaw";

const baseEvent = {
  eventId: "nc_evt_123",
  agentGroupId: "renovation-agent",
  conversationId: "thread-456",
  senderId: "operator-789",
  text: "/visit Kitchen inspection notes",
  metadata: {
    channel: "cli",
  },
};

describe("nanoclawWebhookEventSchema", () => {
  it("accepts a narrow NanoClaw raw webhook event", () => {
    expect(nanoclawWebhookEventSchema.parse(baseEvent)).toMatchObject({
      eventId: "nc_evt_123",
      text: "/visit Kitchen inspection notes",
      metadata: {
        channel: "cli",
      },
    });
  });

  it("normalizes empty optional ids to null", () => {
    expect(
      nanoclawWebhookEventSchema.parse({
        text: "/status",
        eventId: "",
        senderId: "",
      }),
    ).toMatchObject({
      eventId: null,
      senderId: null,
    });
  });

  it("rejects missing text", () => {
    expect(nanoclawWebhookEventSchema.safeParse({ eventId: "nc_evt_123" }).success).toBe(false);
  });
});

describe("parseNanoclawCommandText", () => {
  it("parses supported slash commands and normalizes dashed names", () => {
    expect(parseNanoclawCommandText("/weekly-summary 2026-06-29 to 2026-07-05")).toEqual({
      command: "weekly_summary",
      args: "2026-06-29 to 2026-07-05",
    });
  });

  it("returns unknown for normal text", () => {
    expect(parseNanoclawCommandText("please check the bathroom")).toEqual({
      command: "unknown",
      args: "please check the bathroom",
    });
  });
});

describe("buildNanoclawGatewayCommand", () => {
  it("builds a normalized first-party command payload", () => {
    const command = buildNanoclawGatewayCommand(
      nanoclawWebhookEventSchema.parse(baseEvent),
      new Date("2026-07-03T12:00:00.000Z"),
    );

    expect(command).toEqual({
      source: "nanoclaw",
      eventId: "nc_evt_123",
      agentGroupId: "renovation-agent",
      conversationId: "thread-456",
      senderId: "operator-789",
      text: "/visit Kitchen inspection notes",
      command: "visit",
      args: "Kitchen inspection notes",
      metadata: {
        channel: "cli",
      },
      receivedAt: "2026-07-03T12:00:00.000Z",
    });

    expect(nanoclawGatewayCommandSchema.safeParse(command).success).toBe(true);
  });
});

describe("nanoclawGatewayRuntimeConfigSchema", () => {
  it("accepts the required runtime gateway configuration", () => {
    expect(
      nanoclawGatewayRuntimeConfigSchema.safeParse({
        webhookToken: "nanoclaw-webhook-token",
        gatewayApiUrl: "https://reforma.example.com/api/gateway/nanoclaw/commands",
        gatewayApiToken: "nanoclaw-gateway-token",
      }).success,
    ).toBe(true);
  });

  it("rejects weak shared secrets", () => {
    expect(
      nanoclawGatewayRuntimeConfigSchema.safeParse({
        webhookToken: "short",
        gatewayApiUrl: "https://reforma.example.com/api/gateway/nanoclaw/commands",
        gatewayApiToken: "nanoclaw-gateway-token",
      }).success,
    ).toBe(false);
  });
});
