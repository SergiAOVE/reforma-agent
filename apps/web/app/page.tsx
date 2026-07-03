import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "../lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/projects");
  }

  return (
    <>
      <h1>reforma-agent</h1>
      <p>
        Open source PWA for intelligent home renovation tracking: site visits, evidence (photos and
        audio), issues, pending decisions, technical documents and an itemized budget.
      </p>
      <p>
        <Link href="/login">Sign in to your projects →</Link>
      </p>
      <div className="card">
        <h2>Status</h2>
        <p className="muted">
          Phase 2: authentication, projects and memberships. Site visits, evidence uploads and AI
          summaries arrive in later phases — see <code>PLAN.md</code> in the repository.
        </p>
      </div>
    </>
  );
}
