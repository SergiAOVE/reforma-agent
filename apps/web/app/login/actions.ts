"use server";

import { redirect } from "next/navigation";

import { signInSchema, signUpSchema } from "@reforma/core";

import { ensureProfile } from "../../lib/auth";
import { createClient } from "../../lib/supabase/server";

function loginRedirect(mode: "signin" | "signup", error: string): never {
  redirect(`/login?mode=${mode}&error=${encodeURIComponent(error)}`);
}

export async function signIn(formData: FormData): Promise<void> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    loginRedirect("signin", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Generic message on purpose: echoing the provider error would reveal
    // whether the email is registered. Details go to the server log only.
    console.error("signIn failed:", error.message);
    loginRedirect("signin", "Invalid email or password.");
  }

  await ensureProfile(supabase, data.user);
  redirect("/projects");
}

export async function signUp(formData: FormData): Promise<void> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    loginRedirect("signup", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });

  if (error) {
    // Generic message on purpose: "User already registered" and similar
    // provider errors enable account enumeration.
    console.error("signUp failed:", error.message);
    loginRedirect("signup", "Unable to create the account. Try signing in, or use another email.");
  }

  // With email confirmation enabled there is no session yet: ask the user
  // to confirm first. Locally confirmations are disabled, so we sign in.
  if (!data.session || !data.user) {
    loginRedirect("signin", "Account created. Check your email to confirm, then sign in.");
  }

  await ensureProfile(supabase, data.user);
  redirect("/projects");
}
