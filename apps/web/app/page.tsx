const foundationItems = [
  "Next.js App Router",
  "TypeScript strict mode",
  "Supabase-ready structure",
  "Separate worker boundary",
  "Reviewable AI draft principle"
] as const;

export default function Home() {
  return (
    <main className="page-shell">
      <section className="status-panel" aria-labelledby="phase-title">
        <div className="status-copy">
          <p className="eyebrow">reforma-agent</p>
          <h1 id="phase-title">Phase 0 foundation</h1>
          <p className="summary">
            This repository is ready for the first review. Business workflows,
            Supabase tables, auth, storage, transcription, and real AI are
            intentionally deferred to later phases.
          </p>
        </div>

        <div className="site-visit-board" aria-label="Phase 0 scope">
          <div className="board-header">
            <span>Repository baseline</span>
            <strong>Phase 0</strong>
          </div>
          <ul>
            {foundationItems.map((item) => (
              <li key={item}>
                <span aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
