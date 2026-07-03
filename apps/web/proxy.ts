import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@reforma/db";

import { getSupabaseAnonKey, getSupabaseUrl } from "./lib/env";

/**
 * Refreshes the Supabase session cookie on every request (expired access
 * tokens are renewed here, so server components can rely on getUser()), and
 * keeps unauthenticated visitors out of the app area.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      for (const { name, value } of cookiesToSet) {
        request.cookies.set(name, value);
      }
      response = NextResponse.next({ request });
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options);
      }
    },
  });

  // Do not run other code between client creation and getUser(): the call
  // refreshes the session and rewrites the auth cookies when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && path.startsWith("/projects")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/projects";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip static assets; everything else needs fresh session cookies.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
