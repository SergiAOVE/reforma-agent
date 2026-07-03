import { createProject } from "./actions";

interface NewProjectPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  const { error } = await searchParams;

  return (
    <>
      <h1>New project</h1>

      {error ? <p className="notice error">{error}</p> : null}

      <form action={createProject} className="card">
        <label className="field">
          <span>Project name</span>
          <input name="name" required maxLength={120} placeholder="Kitchen and bathrooms" />
        </label>
        <label className="field">
          <span>Address label (optional — a nickname, not the full address)</span>
          <input name="addressLabel" maxLength={120} placeholder="Barcelona flat" />
        </label>
        <label className="field">
          <span>Description (optional)</span>
          <textarea name="description" rows={3} maxLength={2000} />
        </label>
        <button type="submit">Create project</button>
      </form>
      <p className="muted">You become the owner of the project and can invite members later.</p>
    </>
  );
}
