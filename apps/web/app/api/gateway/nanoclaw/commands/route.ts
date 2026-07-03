import { nanoclawGatewayCommandSchema, type NanoclawGatewayCommand } from "@reforma/core";
import { NextResponse } from "next/server";

import { getBearerToken } from "../../../../../lib/nanoclaw-gateway";

export const runtime = "nodejs";

function buildCommandResponse(command: NanoclawGatewayCommand): string {
  switch (command.command) {
    case "help":
      return "Available commands: /status, /visit <note>, /issue <note>, /decision <note>, and /weekly-summary <range>. NanoClaw is an optional gateway; project data remains protected by the web app and RLS.";
    case "status":
      return "The reforma-agent NanoClaw gateway is online. Open the web app to view project dashboards and review drafts.";
    case "visit":
      if (!command.args) {
        return "Send /visit <note> to forward a visit-note intent. Visit creation still happens through the first-party web app.";
      }

      return "Visit-note intent received. This Phase 11 gateway does not create project rows from NanoClaw directly.";
    case "issue":
      if (!command.args) {
        return "Send /issue <note> to forward an issue intent. Issue creation still happens through the first-party web app.";
      }

      return "Issue intent received. This Phase 11 gateway does not create issue rows from NanoClaw directly.";
    case "decision":
      if (!command.args) {
        return "Send /decision <note> to forward a decision intent. Decision creation still happens through the first-party web app.";
      }

      return "Decision intent received. This Phase 11 gateway does not create decision rows from NanoClaw directly.";
    case "weekly_summary":
      return "Weekly-summary intent received. This Phase 11 gateway does not enqueue AI jobs from NanoClaw directly.";
    case "unknown":
      return "Command received but not recognized. Use /help for the supported NanoClaw commands.";
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const expectedToken = process.env.NANOCLAW_GATEWAY_API_TOKEN?.trim();

  if (!expectedToken) {
    return NextResponse.json(
      { ok: false, message: "NanoClaw first-party gateway API is not configured." },
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
  const commandResult = nanoclawGatewayCommandSchema.safeParse(body);

  if (!commandResult.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid NanoClaw command payload." },
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
