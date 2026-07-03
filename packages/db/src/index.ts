export type SupabaseRuntime = "browser" | "server" | "worker";

export type SupabaseEnvironment = {
  readonly url: string;
  readonly anonKey?: string;
  readonly serviceRoleKey?: string;
  readonly runtime: SupabaseRuntime;
};

export function assertNoServiceRoleInBrowser(
  environment: SupabaseEnvironment
): void {
  if (environment.runtime === "browser" && environment.serviceRoleKey) {
    throw new Error("Supabase service role key must never be used in browser runtime.");
  }
}
