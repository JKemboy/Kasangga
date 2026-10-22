import { useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { getSupabaseClient } from "../../services/supabaseClient.js";
import { input, primary } from "../tutor/workspace/ui.jsx";
export default function AccountSettings() {
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    if (password.length < 8)
      return setError("Use at least 8 characters for your password.");
    if (password !== confirmation) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const { error } = await getSupabaseClient().auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmation("");
      setNotice("Password updated.");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto max-w-3xl space-y-4 p-5">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="rounded-xl border bg-white p-4">
        <label className="block text-xs font-medium">
          Email Address
          <input
            readOnly
            value={auth.user.email || ""}
            className={input + " mt-2 bg-slate-50"}
          />
        </label>
      </div>
      <form
        onSubmit={save}
        className="space-y-4 rounded-xl border bg-white p-4"
      >
        <h2 className="font-semibold">Change Password</h2>
        <label className="block text-xs font-medium">
          New Password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            disabled={busy}
            onChange={(event) => setPassword(event.target.value)}
            className={input + " mt-2"}
          />
        </label>
        <label className="block text-xs font-medium">
          Confirm Password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmation}
            disabled={busy}
            onChange={(event) => setConfirmation(event.target.value)}
            className={input + " mt-2"}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-green-800">
            {notice}
          </p>
        )}
        <button disabled={busy} className={primary}>
          {busy ? "Saving..." : "Update Password"}
        </button>
      </form>
    </section>
  );
}
