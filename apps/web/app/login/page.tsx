import { signIn, signUp } from "./actions";

interface LoginPageProps {
  searchParams: Promise<{ mode?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { mode, error } = await searchParams;
  const signup = mode === "signup";

  return (
    <>
      <h1>{signup ? "Create an account" : "Sign in"}</h1>

      {error ? <p className="notice error">{error}</p> : null}

      {signup ? (
        <form action={signUp} className="card">
          <label className="field">
            <span>Full name</span>
            <input name="fullName" autoComplete="name" required />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            <span>Password (min. 6 characters)</span>
            <input name="password" type="password" autoComplete="new-password" required />
          </label>
          <button type="submit">Create account</button>
        </form>
      ) : (
        <form action={signIn} className="card">
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit">Sign in</button>
        </form>
      )}

      <p className="muted">
        {signup ? (
          <a href="/login">Already have an account? Sign in</a>
        ) : (
          <a href="/login?mode=signup">No account yet? Create one</a>
        )}
      </p>
    </>
  );
}
