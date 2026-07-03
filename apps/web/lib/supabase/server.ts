import { cookies } from "next/headers";

import { createServerSupabaseClient, type TypedSupabaseClient } from "@reforma/db";

import { getSupabaseAnonKey, getSupabaseUrl } from "../env";

/**
 * Supabase client for server components, server actions and route handlers.
 * Uses the publishable key: every query is subject to RLS as the signed-in
 * user. Create a fresh client per request — never cache it in module scope.
 */
export async function createClient(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies();

  return createServerSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Called from a Server Component render, where cookies are read-only.
        // Safe to ignore: proxy.ts refreshes sessions on every request.
      }
    },
  });
}
