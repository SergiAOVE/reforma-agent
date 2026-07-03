const workerId = process.env.WORKER_ID ?? "local-worker";

console.info("reforma-agent worker started", {
  workerId,
  mode: process.env.NODE_ENV ?? "development"
});
