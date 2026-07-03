/**
 * Typed Supabase client factories.
 *
 * Framework-agnostic on purpose: the Next.js cookie wiring lives in
 * apps/web/lib/supabase. Both factories take the URL and the PUBLISHABLE
 * (anon) key — every query they run is protected by RLS.
 *
 * Non-negotiable rule: the service role key is never used here and never
 * reaches the client. A worker-only factory will be added in Phase 5 inside
 * apps/worker, not in this package's browser-safe surface.
 */
import {
  createBrowserClient as createSsrBrowserClient,
  createServerClient as createSsrServerClient,
} from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type { Database, Json } from "./database.types";
export type { SupabaseClient, User } from "@supabase/supabase-js";

/** Convenience row/enum aliases for app code. */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];

export type TypedSupabaseClient = SupabaseClient<Database>;

/** Cookie adapter contract expected by the server client (see @supabase/ssr). */
export interface CookieMethods {
  getAll(): { name: string; value: string }[] | Promise<{ name: string; value: string }[]>;
  setAll(cookies: { name: string; value: string; options?: object }[]): void | Promise<void>;
}

/** Client for browser components. Safe: publishable key + RLS. */
export function createBrowserSupabaseClient(url: string, publishableKey: string) {
  return createSsrBrowserClient<Database>(url, publishableKey);
}

/**
 * Client for server components, server actions and route handlers.
 * The caller provides framework-specific cookie access (Next.js: cookies()).
 */
export function createServerSupabaseClient(
  url: string,
  publishableKey: string,
  cookies: CookieMethods,
) {
  return createSsrServerClient<Database>(url, publishableKey, { cookies });
}
