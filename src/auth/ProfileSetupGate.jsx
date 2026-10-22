import {
  collegeProgramMap,
  findCollege,
} from "../services/collegeProgramMap.js";
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
import LearnerHelpSupport from "../components/learner/support/LearnerHelpSupport.jsx";

const studyInterests = [
  "Mathematics",
  "Science",
  "English",
  "Filipino",
  "History",
  "Programming",
  "Engineering",
  "Business",
];

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
  const initialInterests = values.interests
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const [selectedInterests, setSelectedInterests] = useState(() =>
    initialInterests.filter((item) => studyInterests.includes(item)),
  );
  const [otherInterest, setOtherInterest] = useState(() =>
    initialInterests
      .filter((item) => !studyInterests.includes(item))
      .join(", "),
  );
  const [includeOther, setIncludeOther] = useState(() =>
    initialInterests.some((item) => !studyInterests.includes(item)),
  );
  const updateInterests = (selected, other, enabled) => {
    setSelectedInterests(selected);
    setOtherInterest(other);
    setIncludeOther(enabled);
    setValues((previous) => ({
      ...previous,
      interests: [
        ...selected,
        ...(enabled && other.trim() ? [other.trim()] : []),
      ].join(", "),
    }));
  };
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [idReviewed, setIdReviewed] = useState(false);
  const [extractionAttempted, setExtractionAttempted] = useState(false);
  const [detailsEditable, setDetailsEditable] = useState(false);
  const [idImage, setIdImage] = useState(null);
  const [error, setError] = useState("");
  const verified = !!auth.user.email_confirmed_at;
  const go = (id) => {
    if (["dashboard", "help-support"].includes(id)) setView(id);
    else setOpen(true);
  };
  async function save(e) {
    e.preventDefault();
    if (busy || ocrBusy) return;
    if (includeOther && !otherInterest.trim())
      return setError("Specify your other study interests.");
    const issue = profileError(values, verified);
    if (issue) return setError(issue);
    if (!/^\+639\d{9}$/.test(values.phone))
      return setError(
        "Enter a valid Philippine mobile number: +63 followed by 10 digits starting with 9.",
      );
    if (!extractionAttempted || !idImage)
      return setError("Upload and extract your Student ID before saving.");
    if (!idReviewed)
      return setError(
        "Review and confirm your Student ID details before saving.",
      );
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
            <div className="flex w-full items-center justify-between gap-3">
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
                className={primary + " ml-auto"}
              >
                {busy ? "Uploading ID and saving..." : "Save and Continue"}
              </button>
            </div>
          }
        >
          <form
            id="learner-profile-setup"
            noValidate
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
                  <label className="block text-xs font-medium">
                    Phone Number <span className="text-red-600">*</span>
                    <div className="mt-1 flex items-center overflow-hidden rounded-md border border-slate-200 bg-white">
                      <span className="border-r border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
                        +63
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        aria-label="Philippine mobile number"
                        required
                        maxLength={10}
                        placeholder="9XXXXXXXXX"
                        value={values.phone.replace(/^\+63|^0/, "")}
                        onChange={(e) => {
                          let digits = e.target.value.replace(/\D/g, "");
                          if (digits.startsWith("63") && digits.length > 10)
                            digits = digits.slice(2);
                          if (digits.startsWith("0")) digits = digits.slice(1);
                          setValues({
                            ...values,
                            phone: digits ? "+63" + digits.slice(0, 10) : "",
                          });
                        }}
                        className={input + " border-0"}
                      />
                    </div>
                    <span className="mt-1 block text-[11px] text-slate-500">
                      Enter 10 digits starting with 9.
                    </span>
                  </label>
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
                  <fieldset className="space-y-2">
                    <legend className="text-xs font-medium">
                      Student Interests <span className="text-red-600">*</span>
                    </legend>
                    <div className="grid grid-cols-2 gap-2">
                      {studyInterests.map((interest) => (
                        <label
                          key={interest}
                          className="flex items-center gap-2 text-xs"
                        >
                          <input
                            type="checkbox"
                            className="accent-green-800"
                            checked={selectedInterests.includes(interest)}
                            onChange={(e) =>
                              updateInterests(
                                e.target.checked
                                  ? [...selectedInterests, interest]
                                  : selectedInterests.filter(
                                      (item) => item !== interest,
                                    ),
                                otherInterest,
                                includeOther,
                              )
                            }
                          />
                          {interest}
                        </label>
                      ))}
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          className="accent-green-800"
                          checked={includeOther}
                          onChange={(e) =>
                            updateInterests(
                              selectedInterests,
                              otherInterest,
                              e.target.checked,
                            )
                          }
                        />
                        Others
                      </label>
                    </div>
                    {includeOther && (
                      <label className="block text-xs font-medium">
                        Please specify <span className="text-red-600">*</span>
                        <input
                          required
                          maxLength={500}
                          value={otherInterest}
                          onChange={(e) =>
                            updateInterests(
                              selectedInterests,
                              e.target.value,
                              includeOther,
                            )
                          }
                          className={input + " mt-1"}
                        />
                      </label>
                    )}
                  </fieldset>
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
