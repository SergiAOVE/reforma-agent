import { telegramGatewayCommandSchema, type TelegramGatewayCommand } from "@reforma/core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

function buildCommandResponse(command: TelegramGatewayCommand): string {
  switch (command.command) {
    case "start":
      return "reforma-agent Telegram gateway is connected. Use /help to see the available commands.";
    case "help":
      return "Available commands: /status and /visit <note>. Telegram is an optional gateway; project data remains protected by the web app and RLS.";
    case "status":
      return "The reforma-agent Telegram gateway is online. Open the web app to view project dashboards and review drafts.";
    case "visit":
      if (!command.args) {
        return "Send /visit <note> to forward a visit note intent. Visit creation still happens through the first-party web app.";
      }

      return "Visit note intent received. This Phase 10 gateway does not create project rows from Telegram directly.";
    case "unknown":
      return "Command received but not recognized. Use /help for the supported Telegram commands.";
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const expectedToken = process.env.TELEGRAM_GATEWAY_API_TOKEN?.trim();

  if (!expectedToken) {
    return NextResponse.json(
      { ok: false, message: "Telegram first-party gateway API is not configured." },
      { status: 501 },
    );
  }

  if (getBearerToken(request.headers) !== expectedToken) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized gateway request." },
      { status: 401 },
    );
  }

  const body = await request.json().catch((): unknown => null);
  const commandResult = telegramGatewayCommandSchema.safeParse(body);

  if (!commandResult.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid Telegram command payload." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      message: buildCommandResponse(commandResult.data),
    },
    { status: 202 },
  );
}
