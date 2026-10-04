import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";
import { getSupabaseClient } from "../services/supabaseClient.js";
export default function ResetPassword() {
  const auth = useAuth(),
    navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (password !== confirmation) return setError("Passwords must match.");
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabaseClient().auth.updateUser({ password });
      if (error) throw error;
      await auth.signOut();
      navigate("/login", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (auth.loading) return <p role="status">Loading your session…</p>;
  return (
    <main className="mx-auto mt-20 max-w-sm rounded-xl border bg-white p-6">
      <h1 className="text-xl font-bold">Reset password</h1>
      {auth.session ? (
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <label className="block">
            New password
            <input
              className="w-full rounded border p-2"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="block">
            Confirm password
            <input
              className="w-full rounded border p-2"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          <button
            disabled={busy}
            className="rounded bg-green-800 p-2 text-white"
          >
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      ) : (
        <p>
          Open a valid password-reset link from your email, or request a new one
          from Login.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <a href="/login" className="mt-4 block underline">
        Back to login
      </a>
    </main>
  );
}
