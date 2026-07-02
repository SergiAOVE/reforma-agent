/**
 * reforma-agent worker (Phase 0).
 *
 * It does not process real jobs yet. From Phase 5 onwards it will poll the
 * `agent_jobs` table (audio transcription, textual extractions, summaries)
 * with locking, retries and idempotency.
 *
 * Rules: clear logs without secrets; no AI jobs inside web requests.
 */

function log(message: string): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      source: "worker",
      message,
    }),
  );
}

function main(): void {
  log("reforma-agent worker started");
  log("Phase 0: no job processing; agent_jobs polling arrives in Phase 5");
  log("controlled shutdown");
}

main();
