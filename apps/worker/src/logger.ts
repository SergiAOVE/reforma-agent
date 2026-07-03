export interface LogFields {
  jobId?: string;
  projectId?: string;
  workerId?: string;
  status?: string;
  attempt?: number;
  error?: string;
}

export function log(message: string, fields: LogFields = {}): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      source: "worker",
      message,
      ...fields,
    }),
  );
}
