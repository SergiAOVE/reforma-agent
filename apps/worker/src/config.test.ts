import { describe, expect, it } from "vitest";

import { loadWorkerConfig } from "./config";

describe("loadWorkerConfig", () => {
  it("returns null when service-role config is missing", () => {
    expect(loadWorkerConfig({ NEXT_PUBLIC_SUPABASE_URL: "http://localhost" })).toBeNull();
  });

  it("loads worker settings from environment values", () => {
    const config = loadWorkerConfig({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55321",
      SUPABASE_SERVICE_ROLE_KEY: "secret",
      WORKER_ID: "worker-test",
      WORKER_POLL_INTERVAL_MS: "100",
      WORKER_STALE_AFTER_SECONDS: "30",
      WORKER_RUN_ONCE: "true",
    });

    expect(config).toMatchObject({
      supabaseUrl: "http://127.0.0.1:55321",
      serviceRoleKey: "secret",
      workerId: "worker-test",
      pollIntervalMs: 100,
      staleAfterSeconds: 30,
      runOnce: true,
    });
  });
});
