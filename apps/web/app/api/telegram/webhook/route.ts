import {
  buildTelegramGatewayCommand,
  getTelegramUpdateMessage,
  telegramUpdateSchema,
} from "@reforma/core";
import { NextResponse } from "next/server";

import {
  forwardTelegramGatewayCommand,
  isAuthorizedTelegramWebhook,
  readTelegramGatewayConfig,
  sendTelegramTextSafely,
} from "../../../../lib/telegram-gateway";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    configured: readTelegramGatewayConfig() !== null,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const config = readTelegramGatewayConfig();

  if (!config) {
    return NextResponse.json(
      { ok: false, error: "Telegram gateway is not configured." },
      { status: 501 },
    );
  }

  if (!isAuthorizedTelegramWebhook(request.headers, config.webhookSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized webhook." }, { status: 401 });
  }

  const body = await request.json().catch((): unknown => null);
  const updateResult = telegramUpdateSchema.safeParse(body);

  if (!updateResult.success) {
    return NextResponse.json({ ok: false, error: "Invalid Telegram update." }, { status: 400 });
  }

  const command = buildTelegramGatewayCommand(updateResult.data);
  const message = getTelegramUpdateMessage(updateResult.data);

  if (!command) {
    if (message) {
      await sendTelegramTextSafely(
        config,
        message.chat.id,
        "Only text commands are supported by this reforma-agent gateway. Use /help in Telegram or the web app for uploads.",
      );
    }

    return NextResponse.json({ ok: true, forwarded: false });
  }

  const gatewayResponse = await forwardTelegramGatewayCommand(config, command);

  if (gatewayResponse.message) {
    await sendTelegramTextSafely(config, command.chatId, gatewayResponse.message);
  }

  return NextResponse.json({
    ok: gatewayResponse.ok,
    forwarded: true,
  });
}
