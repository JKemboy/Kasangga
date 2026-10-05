import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider.jsx";
import { useLogout } from "../components/shared/LogoutProvider.jsx";
import { getSupabaseClient } from "../services/supabaseClient.js";
import {
  needsProfile,
  profileValues,
  profileError,
} from "../services/profileCompletion.js";
import LearnerWorkspace from "../components/learner/workspace/LearnerWorkspace.jsx";
import LearnerSettings from "../components/learner/settings/LearnerSettings.jsx";
import LearnerHelpSupport from "../components/learner/support/LearnerHelpSupport.jsx";

export default function ProfileSetupGate({ children }) {
  const auth = useAuth();
  const restricted =
    auth.roles.includes("learner") && needsProfile(auth.profile, auth.user);
  return restricted ? <Setup key={auth.user.id} /> : children;
}
function Setup() {
  const auth = useAuth();
  const logout = useLogout();
  const [view, setView] = useState("settings");
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState(() => profileValues(auth.profile));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef(null);
  const verified = !!auth.user.email_confirmed_at;
  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
    else if (!open && dialog.current.open) dialog.current.close();
  }, [open]);
  const go = (id) => {
    if (["settings", "help-support"].includes(id)) setView(id);
    else setOpen(true);
  };
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    const issue = profileError(values, verified);
    if (issue) return setError(issue);
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabaseClient().rpc(
        "complete_learner_profile",
        { details: values },
      );
      if (error) throw error;
      auth.retry();
    } catch (e) {
      setError(
        e.code === "23505"
          ? "That Student ID is already in use. Check your Student ID."
          : "Could not save your profile. Check your connection or contact support. The profile setup SQL must be installed in Supabase.",
      );
    } finally {
      setBusy(false);
    }
  }
  const field = (key, label, maxLength = 150) => (
    <label key={key} className="block text-xs font-medium">
      {label} <span className="text-red-600">*</span>
      <input
        required
        maxLength={maxLength}
        value={values[key]}
        onChange={(e) => setValues({ ...values, [key]: e.target.value })}
        className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm"
      />
    </label>
  );
  return (
    <LearnerWorkspace go={go}>
      <div className="min-h-screen bg-slate-50">
        <header className="flex flex-wrap items-center gap-3 border-b bg-white p-4 text-sm">
          <b className="mr-auto text-green-800">CampusTutor</b>
          <button onClick={() => go("settings")}>Settings</button>
          <button onClick={() => go("help-support")}>Help &amp; Support</button>
          <button onClick={logout}>Logout</button>
        </header>
        <div className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <p>
            Complete your profile to access your dashboard and other sections.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="rounded bg-green-800 px-4 py-2 text-white"
          >
            Complete Profile
          </button>
        </div>
        {view === "settings" ? <LearnerSettings /> : <LearnerHelpSupport />}
      </div>
      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
        }}
        aria-labelledby="setup-title"
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-24px)] max-w-xl overflow-y-auto rounded-xl border-0 bg-white p-5 shadow-xl backdrop:bg-black/50"
      >
        <h1 id="setup-title" className="text-lg font-bold">
          Complete your learner profile
        </h1>
        <p className="mb-4 mt-1 text-xs text-slate-500">
          All fields are required before you can continue to the dashboard.
        </p>
        <form onSubmit={save} className="space-y-4">
          <fieldset disabled={busy} className="space-y-3">
            <legend className="mb-2 text-sm font-semibold">
              Personal Information
            </legend>
            {field("name", "Full Name")}
            {field("studentId", "Student ID", 50)}
            <label className="block text-xs font-medium">
              Email Address
              <input
                readOnly
                value={auth.user.email || ""}
                className="mt-1 w-full rounded-md border bg-slate-50 p-2 text-sm"
              />
              <span className={verified ? "text-green-700" : "text-red-700"}>
                {verified ? "Verified" : "Not verified"}
              </span>
            </label>
            {field("phone", "Phone Number", 20)}
          </fieldset>
          <fieldset disabled={busy} className="space-y-3">
            <legend className="mb-2 text-sm font-semibold">About Me</legend>
            <label className="block text-xs font-medium">
              Short Bio *
              <textarea
                required
                maxLength={1000}
                value={values.bio}
                onChange={(e) => setValues({ ...values, bio: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-md border p-2 text-sm"
              />
            </label>
            {field(
              "interests",
              "Study Interests / Preferred Subjects (comma-separated)",
              1000,
            )}
          </fieldset>
          <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold">
              Academic Information
            </legend>
            {field("program", "Course / Program")}
            <label className="text-xs font-medium">
              Year Level *
              <select
                required
                value={values.year}
                onChange={(e) => setValues({ ...values, year: e.target.value })}
                className="mt-1 w-full rounded-md border p-2 text-sm"
              >
                <option value="">Select year</option>
                {[1, 2, 3, 4, 5, 6].map((v) => (
                  <option key={v} value={v}>
                    Year {v}
                  </option>
                ))}
              </select>
            </label>
            {field("college", "College")}
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            disabled={busy || !!profileError(values, verified)}
            className="w-full rounded-md bg-green-800 p-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving?" : "Save and Continue"}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-green-800">
          <button
            disabled={busy}
            onClick={() => {
              setView("settings");
              setOpen(false);
            }}
          >
            Settings
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setView("help-support");
              setOpen(false);
            }}
          >
            Help &amp; Support
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            Logout
          </button>
        </div>
      </dialog>
    </LearnerWorkspace>
  );
}
