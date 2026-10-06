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
  removeStudentIdImage,
  uploadStudentIdImage,
} from "../services/studentIdStorage.js";
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
  const [extractionAttempted, setExtractionAttempted] = useState(false);
  const [detailsEditable, setDetailsEditable] = useState(false);
  const [idImage, setIdImage] = useState(null);
  const [error, setError] = useState("");
  const verified = !!auth.user.email_confirmed_at;
  const go = (id) => {
    if (["dashboard", "settings", "help-support"].includes(id)) setView(id);
    else setOpen(true);
  };
  async function save(e) {
    e.preventDefault();
    if (busy || ocrBusy) return;
    if (!extractionAttempted || !idImage)
      return setError("Upload and extract your Student ID before saving.");
    if (!idReviewed)
      return setError(
        "Review and confirm your Student ID details before saving.",
      );
    const issue = profileError(values, verified);
    if (issue) return setError(issue);
    setBusy(true);
    setError("");
    try {
      const client = getSupabaseClient();
      const previousImagePath = auth.profile?.student_id_image_path || "";
      const imagePath = await uploadStudentIdImage(
        idImage,
        values.name,
        auth.user.id,
        client,
      );
      try {
        const { error } = await client.rpc("complete_learner_profile", {
          details: { ...values, studentIdImagePath: imagePath },
        });
        if (error) throw error;
      } catch (saveError) {
        if (imagePath !== previousImagePath) {
          try {
            await removeStudentIdImage(imagePath, auth.user.id, client);
          } catch (cleanupError) {
            throw new Error(
              `${saveError.message} The uploaded image could not be removed: ${cleanupError.message}`,
            );
          }
        }
        throw saveError;
      }
      if (previousImagePath && previousImagePath !== imagePath) {
        try {
          await removeStudentIdImage(previousImagePath, auth.user.id, client);
        } catch (cleanupError) {
          setError(
            `Profile saved, but the previous Student ID image could not be removed: ${cleanupError.message}`,
          );
        }
      }
      auth.retry();
    } catch (e) {
      setError(
        e.code === "23505"
          ? "That Student ID is already in use. Check your Student ID."
          : `Could not save your profile: ${e.message}`,
      );
    } finally {
      setBusy(false);
    }
  }
  const field = (key, label, maxLength = 150, locked = false) => (
    <label key={key} className="block text-xs font-medium">
      {label} <span className="text-red-600">*</span>
      <input
        required
        disabled={busy || ocrBusy || locked}
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
          subtitle="Upload and extract your CSU Student ID before reviewing and completing your profile."
          onClose={(event) => {
            if (busy || ocrBusy) event?.preventDefault();
            else setOpen(false);
          }}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                {!extractionAttempted
                  ? "Extract your Student ID to continue."
                  : !idReviewed
                    ? "Review and confirm your ID details to continue."
                    : profileError(values, verified) ||
                      (!idImage && "Keep the ID image selected to continue.")}
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
                {extractionAttempted &&
                  !!idImage &&
                  idReviewed &&
                  !profileError(values, verified) && (
                    <button
                      type="submit"
                      form="learner-profile-setup"
                      disabled={busy || ocrBusy}
                      className={primary}
                    >
                      {busy
                        ? "Uploading ID and saving..."
                        : "Save and Continue"}
                    </button>
                  )}
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
              onAttempted={setExtractionAttempted}
              onImage={setIdImage}
              allowEdit={detailsEditable}
              onAllowEdit={setDetailsEditable}
              onFields={(fields) =>
                setValues((previous) => applyIdFields(previous, fields))
              }
            />
            {extractionAttempted && (
              <>
                <fieldset
                  disabled={busy || ocrBusy}
                  className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2"
                >
                  <legend className="mb-2 text-sm font-semibold">
                    Personal Information
                  </legend>
                  {field("name", "Full Name", 150, !detailsEditable)}
                  {field("studentId", "Student ID", 50, !detailsEditable)}
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
                  <legend className="mb-2 text-sm font-semibold">
                    About Me
                  </legend>
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
                      disabled={!detailsEditable}
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
                      disabled={
                        !detailsEditable || !findCollege(values.college)
                      }
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
                      {(findCollege(values.college)?.programs || []).map(
                        (p) => (
                          <option key={p.code} value={p.name}>
                            {p.name}
                          </option>
                        ),
                      )}
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
              </>
            )}
            {extractionAttempted && (
              <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-green-800"
                  checked={idReviewed}
                  disabled={busy || ocrBusy}
                  onChange={(event) => setIdReviewed(event.target.checked)}
                />
                <span>
                  I have reviewed the ID details and will correct any missing or
                  inaccurate information before saving.
                </span>
              </label>
            )}
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
