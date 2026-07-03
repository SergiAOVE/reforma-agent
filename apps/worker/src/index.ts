import { createAiProviderFromEnv } from "@reforma/ai";
import type { Database } from "@reforma/db";
import { createClient } from "@supabase/supabase-js";

import { loadWorkerConfig, type WorkerConfig } from "./config";
import { log } from "./logger";
import { claimNextJob, processJob } from "./processor";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createServiceClient(config: WorkerConfig) {
  return createClient<Database>(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function runWorker(config: WorkerConfig, abortSignal?: AbortSignal): Promise<void> {
  const supabase = createServiceClient(config);
  const provider = createAiProviderFromEnv(process.env);

  log("reforma-agent worker started", {
    workerId: config.workerId,
    status: `provider:${provider.name}`,
  });

  while (!abortSignal?.aborted) {
    const job = await claimNextJob(supabase, config.workerId, config.staleAfterSeconds);

    if (job) {
      log("job claimed", {
        jobId: job.id,
        projectId: job.project_id,
        workerId: config.workerId,
        status: job.type,
        attempt: job.attempt_count,
      });
      await processJob(supabase, provider, config.workerId, job);
      if (config.runOnce) break;
      continue;
    }

    if (config.runOnce) break;
    await sleep(config.pollIntervalMs);
  }

  log("controlled shutdown", { workerId: config.workerId });
}

async function main(): Promise<void> {
  const config = loadWorkerConfig(process.env);
  if (!config) {
    log(
      "worker disabled: missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    return;
  }

  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort());
  process.once("SIGTERM", () => controller.abort());

  await runWorker(config, controller.signal);
}

main().catch((error: unknown) => {
  log("worker crashed", { error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
