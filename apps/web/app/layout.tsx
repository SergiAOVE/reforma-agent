import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { createClient } from "../lib/supabase/server";
import { signOut } from "./actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "reforma-agent",
  description: "Intelligent home renovation tracking",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container">
            <Link href={user ? "/projects" : "/"} className="brand">
              reforma-agent
            </Link>
            {user ? (
              <div className="user-chip">
                <span>{user.email}</span>
                <form action={signOut}>
                  <button type="submit" className="secondary">
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/login">Sign in</Link>
            )}
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
