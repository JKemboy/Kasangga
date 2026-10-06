import { collegeProgramMap, findCollege } from "../data/collegeProgramMap.js";
import { applyIdFields } from "../services/studentIdOcr.js";
import StudentIdUpload from "./StudentIdUpload.jsx";
import LearnerOverview from "../components/learner/dashboard/LearnerOverview.jsx";
import StudentShell from "../components/shared/StudentShell.jsx";
import { learnerNav } from "../components/learner/learnerNavigation.js";
import { useState } from "react";
import {
  Modal,
  input,
  button,
  primary,
} from "../components/tutor/workspace/ui.jsx";
import { useAuth } from "./AuthProvider.jsx";
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
  const [view, setView] = useState("dashboard");
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState(() => profileValues(auth.profile));
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [idReviewed, setIdReviewed] = useState(false);
  const [error, setError] = useState("");
  const verified = !!auth.user.email_confirmed_at;
  const go = (id) => {
    if (["dashboard", "settings", "help-support"].includes(id)) setView(id);
    else setOpen(true);
  };
  async function save(e) {
    e.preventDefault();
    if (busy || ocrBusy) return;
    if (!idReviewed)
      return setError(
        "Review the ID extraction or choose manual entry before saving.",
      );
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
        className={input + " mt-1"}
      />
    </label>
  );
  return (
    <LearnerWorkspace go={go}>
      <div className="min-h-screen bg-slate-50">
        <StudentShell
          role="learner"
          nav={learnerNav}
          view={view}
          go={go}
          profileRestricted
          searchContent={
            <input
              aria-label="Search learner sections"
              placeholder="Search learner sections..."
              readOnly
              onClick={() => setOpen(true)}
              className="h-8 w-full max-w-lg rounded-md border border-slate-200 px-3 text-xs"
            />
          }
        />
        <main
          className="min-h-screen bg-[#fbfcfe] pt-[64px] md:ml-[230px]"
          aria-label="Dashboard content"
        >
          <div className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p>Complete your profile to unlock the remaining sections.</p>
            <button
              onClick={() => setOpen(true)}
              className="rounded bg-green-800 px-4 py-2 text-white"
            >
              Complete Profile
            </button>
          </div>
          {view === "dashboard" ? (
            <LearnerOverview go={go} />
          ) : view === "settings" ? (
            <LearnerSettings />
          ) : (
            <LearnerHelpSupport />
          )}
        </main>
      </div>
      {open && (
        <Modal
          title="Complete your learner profile"
          subtitle="Add your details to unlock all learner sections."
          onClose={(event) => {
            if (busy || ocrBusy) event?.preventDefault();
            else setOpen(false);
          }}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                All fields are required.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || ocrBusy}
                  className={button}
                  onClick={() => {
                    setView("dashboard");
                    setOpen(false);
                  }}
                >
                  Back to Dashboard
                </button>
                <button
                  type="submit"
                  form="learner-profile-setup"
                  disabled={busy || ocrBusy}
                  className={primary}
                >
                  {busy ? "Saving..." : "Save and Continue"}
                </button>
              </div>
            </div>
          }
        >
          <form
            id="learner-profile-setup"
            onSubmit={save}
            className="space-y-4 text-[#27344f]"
          >
            <StudentIdUpload
              onReady={setIdReviewed}
              onBusy={setOcrBusy}
              onFields={(fields) =>
                setValues((previous) => applyIdFields(previous, fields))
              }
            />
            <fieldset
              disabled={busy || ocrBusy}
              className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2"
            >
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
                  className={input + " mt-1 bg-slate-50"}
                />
                <span
                  className={
                    "mt-1 inline-flex rounded px-2 py-0.5 text-[10px] font-medium " +
                    (verified
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-700")
                  }
                >
                  {verified ? "Verified" : "Not verified"}
                </span>
              </label>
              {field("phone", "Phone Number", 20)}
            </fieldset>
            <fieldset
              disabled={busy || ocrBusy}
              className="space-y-3 rounded-lg border border-slate-200 p-3"
            >
              <legend className="mb-2 text-sm font-semibold">About Me</legend>
              <label className="block text-xs font-medium">
                Short Bio *
                <textarea
                  required
                  maxLength={1000}
                  value={values.bio}
                  onChange={(e) =>
                    setValues({ ...values, bio: e.target.value })
                  }
                  rows={3}
                  className={input + " mt-1"}
                />
              </label>
              {field(
                "interests",
                "Study Interests / Preferred Subjects (comma-separated)",
                1000,
              )}
            </fieldset>
            <fieldset
              disabled={busy || ocrBusy}
              className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2"
            >
              <legend className="mb-2 text-sm font-semibold">
                Academic Information
              </legend>
              <label className="block text-xs font-medium">
                College *
                <select
                  required
                  value={values.college}
                  onChange={(e) =>
                    setValues((previous) => ({
                      ...previous,
                      college: e.target.value,
                      program: "",
                    }))
                  }
                  className={input + " mt-1"}
                >
                  <option value="">Select college</option>
                  {collegeProgramMap.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium">
                Course / Program *
                <select
                  required
                  disabled={!findCollege(values.college)}
                  value={values.program}
                  onChange={(e) =>
                    setValues((previous) => ({
                      ...previous,
                      program: e.target.value,
                    }))
                  }
                  className={input + " mt-1"}
                >
                  <option value="">Select program</option>
                  {(findCollege(values.college)?.programs || []).map((p) => (
                    <option key={p.code} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium">
                Year Level *
                <select
                  required
                  value={values.year}
                  onChange={(e) =>
                    setValues({ ...values, year: e.target.value })
                  }
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
            </fieldset>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
          </form>
        </Modal>
      )}
    </LearnerWorkspace>
  );
}
