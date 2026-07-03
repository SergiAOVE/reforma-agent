import {
  nanoclawGatewayApiResponseSchema,
  nanoclawGatewayRuntimeConfigSchema,
  type NanoclawGatewayApiResponse,
  type NanoclawGatewayCommand,
  type NanoclawGatewayRuntimeConfig,
} from "@reforma/core";

type RuntimeEnv = Record<string, string | undefined>;

export function readNanoclawGatewayConfig(
  env: RuntimeEnv = process.env,
): NanoclawGatewayRuntimeConfig | null {
  const parsed = nanoclawGatewayRuntimeConfigSchema.safeParse({
    webhookToken: env.NANOCLAW_WEBHOOK_TOKEN,
    gatewayApiUrl: env.NANOCLAW_GATEWAY_API_URL,
    gatewayApiToken: env.NANOCLAW_GATEWAY_API_TOKEN,
  });

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

export function isAuthorizedNanoclawWebhook(headers: Headers, webhookToken: string): boolean {
  return getBearerToken(headers) === webhookToken;
}

export async function forwardNanoclawGatewayCommand(
  config: NanoclawGatewayRuntimeConfig,
  command: NanoclawGatewayCommand,
): Promise<NanoclawGatewayApiResponse> {
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
  const parsed = nanoclawGatewayApiResponseSchema.safeParse(body);

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
    message: "The NanoClaw command was not accepted by the reforma-agent gateway.",
  };
}
