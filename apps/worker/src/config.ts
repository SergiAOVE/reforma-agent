export interface WorkerConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  workerId: string;
  pollIntervalMs: number;
  staleAfterSeconds: number;
  runOnce: boolean;
}

function optionalEnv(env: Record<string, string | undefined>, key: string): string | null {
  const value = env[key]?.trim();
  return value && value.length > 0 ? value : null;
}

function numberEnv(env: Record<string, string | undefined>, key: string, fallback: number): number {
  const raw = optionalEnv(env, key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadWorkerConfig(env: Record<string, string | undefined>): WorkerConfig | null {
  const supabaseUrl =
    optionalEnv(env, "SUPABASE_URL") ?? optionalEnv(env, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = optionalEnv(env, "SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    workerId: optionalEnv(env, "WORKER_ID") ?? `worker-${crypto.randomUUID()}`,
    pollIntervalMs: numberEnv(env, "WORKER_POLL_INTERVAL_MS", 5000),
    staleAfterSeconds: numberEnv(env, "WORKER_STALE_AFTER_SECONDS", 600),
    runOnce: optionalEnv(env, "WORKER_RUN_ONCE") === "true",
  };
}
