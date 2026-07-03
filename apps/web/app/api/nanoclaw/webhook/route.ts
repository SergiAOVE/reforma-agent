import { buildNanoclawGatewayCommand, nanoclawWebhookEventSchema } from "@reforma/core";
import { NextResponse } from "next/server";

import {
  forwardNanoclawGatewayCommand,
  isAuthorizedNanoclawWebhook,
  readNanoclawGatewayConfig,
} from "../../../../lib/nanoclaw-gateway";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    configured: readNanoclawGatewayConfig() !== null,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const config = readNanoclawGatewayConfig();

  if (!config) {
    return NextResponse.json(
      { ok: false, error: "NanoClaw gateway is not configured." },
      { status: 501 },
    );
  }

  if (!isAuthorizedNanoclawWebhook(request.headers, config.webhookToken)) {
    return NextResponse.json({ ok: false, error: "Unauthorized webhook." }, { status: 401 });
  }

  const body = await request.json().catch((): unknown => null);
  const eventResult = nanoclawWebhookEventSchema.safeParse(body);

  if (!eventResult.success) {
    return NextResponse.json({ ok: false, error: "Invalid NanoClaw event." }, { status: 400 });
  }

  const command = buildNanoclawGatewayCommand(eventResult.data);
  const gatewayResponse = await forwardNanoclawGatewayCommand(config, command);

  return NextResponse.json({
    ok: gatewayResponse.ok,
    forwarded: true,
    message: gatewayResponse.message,
  });
}
