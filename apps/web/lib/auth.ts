import { redirect } from "next/navigation";

import type { TypedSupabaseClient, User } from "@reforma/db";

import { createClient } from "./supabase/server";

export interface AuthContext {
  supabase: TypedSupabaseClient;
  user: User;
}

/**
 * Loads the signed-in user or redirects to /login. Also makes sure the
 * profile row exists (created on first authenticated visit).
 */
export async function requireUser(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(supabase, user);
  return { supabase, user };
}

/**
 * Creates the user's profile row if it does not exist yet.
 * RLS: users may insert/select only their own profile row.
 */
export async function ensureProfile(supabase: TypedSupabaseClient, user: User): Promise<void> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return;

  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;

  // Ignore duplicates: two parallel requests may both see a missing profile.
  await supabase
    .from("profiles")
    .upsert(
      { id: user.id, email: user.email ?? "", full_name: fullName },
      { onConflict: "id", ignoreDuplicates: true },
    );
}
