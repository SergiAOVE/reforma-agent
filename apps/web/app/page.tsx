export default function HomePage() {
  return (
    <main>
      <h1>reforma-agent</h1>
      <p>
        Open source PWA for intelligent home renovation tracking: site visits, evidence (photos and
        audio), issues, pending decisions, technical documents and an itemized budget.
      </p>
      <h2>Status: Phase 0</h2>
      <p>
        The project is in its bootstrap phase. The monorepo base (web, worker and shared packages),
        initial documentation and quality checks are in place, but there is no business
        functionality yet.
      </p>
      <h2>Next phases</h2>
      <ol>
        <li>Supabase data model with RLS and synthetic seed.</li>
        <li>Authentication, projects and memberships.</li>
        <li>Zones, trades, documents and budget line items.</li>
        <li>Site visits and evidence.</li>
        <li>Job worker and audio transcription.</li>
      </ol>
      <p>
        See <code>PLAN.md</code> and <code>docs/en/</code> in the repository for details.
      </p>
    </main>
  );
}
