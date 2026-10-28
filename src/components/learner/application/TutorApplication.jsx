// Tutor Application: collects learner application data and submits it to the tutor-application service.
import ApplicationStatus from "./ApplicationStatus.jsx";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import {
  ArrowLeft,
  Check,
  LockKeyhole,
  ShieldCheck,
  Upload,
  Info,
} from "lucide-react";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import { scheduleFileError } from "../../tutor/workspace/scheduleUploads.js";
import {
  loadMyTutorApplication,
  submitTutorApplication,
} from "../../../services/tutorApplications.js";
import {
  downloadTutorApplicationDocument,
  removeTutorApplicationDocument,
  uploadTutorApplicationDocument,
} from "../../../services/tutorApplicationStorage.js";
import {
  SUBJECTS,
  documentSlots,
  tutoringError,
  documentsError,
  applicationError,
} from "./applicationRules.js";
import {
  analyzeTutorCredential,
  extractTutorCredentialFields,
  readTutorCredential,
} from "../../../services/tutorCredentialVerification.js";
import "./tutor-application.css";
const STEPS = [
  "Verify Student Information",
  "Tutoring Information",
  "Verification Documents",
  "Review & Submit",
];
const learnerReviewLabel = (status) =>
  status === "Needs Manual Review" ? "Manual Review by Admin" : status;
export default function TutorApplication({ onClose }) {
  const work = useLearnerWorkspace();
  const auth = useAuth();
  const account = {
    name: work.data.profile.name || "",
    studentId: work.data.profile.studentId || "",
    email: work.data.profile.email || "",
    college: work.data.profile.college || "",
    program: work.data.profile.program || "",
    year: work.data.profile.year || "",
  };
  const [draft, setDraft] = useState(() => ({
    courseCode: "",
    courseDescription: "",
    gcashName: "",
    gcashNumber: "",
    subjects: [],
    topics: {},
    bio: "",
    experience: "",
    type: "",
    motivation: "",
    documents: {},
    certified: false,
  }));
  const [applicationId, setApplicationId] = useState(null);
  const [documentChecks, setDocumentChecks] = useState({});
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0),
    [complete, setComplete] = useState(false),
    [statusView, setStatusView] = useState(false),
    [newSubject, setNewSubject] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [progress, setProgress] = useState("");
  const controller = useRef(null),
    mounted = useRef(true),
    heading = useRef(null),
    draftRef = useRef(draft),
    obsoletePaths = useRef(new Set()),
    persistedPaths = useRef(new Set());
  draftRef.current = draft;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [step, complete, statusView]);
  useEffect(() => {
    let active = true;
    async function loadApplication() {
      setLoading(true);
      try {
        const application = await loadMyTutorApplication(auth.user.id);
        if (!active) return;
        if (application) {
          const resubmission = application.status === "Resubmission Required";
          persistedPaths.current = new Set(
            Object.values(application.documents)
              .map((document) => document.storagePath)
              .filter(Boolean),
          );
          setApplicationId(application.id);
          setDraft({ ...application, certified: resubmission });
          setComplete(true);
          setStatusView(true);
          if (resubmission) setStep(2);
        }
      } catch (e) {
        if (active)
          setError(`Could not load your tutor application: ${e.message}`);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadApplication();
    return () => {
      active = false;
    };
  }, [auth.user.id]);
  function patch(key, value) {
    setError("");
    setDraft((d) => ({ ...d, [key]: value, certified: false }));
  }
  function toggleSubject(subject) {
    setDraft((d) => {
      const selected = d.subjects.includes(subject),
        topics = { ...d.topics };
      if (selected) delete topics[subject];
      return {
        ...d,
        subjects: selected
          ? d.subjects.filter((s) => s !== subject)
          : [...d.subjects, subject],
        topics,
        certified: false,
      };
    });
  }
  async function saveDraft() {
    if (!complete) {
      setBusy("cleaning");
      setError("");
      try {
        for (const document of Object.values(draftRef.current.documents)) {
          if (
            document.storagePath &&
            !persistedPaths.current.has(document.storagePath)
          )
            await removeTutorApplicationDocument(
              document.storagePath,
              auth.user.id,
            );
        }
      } catch (cleanupError) {
        setError(
          `Could not remove an unsubmitted application document: ${cleanupError.message}`,
        );
        setBusy("");
        return;
      } finally {
        if (mounted.current) setBusy("");
      }
    }
    onClose();
  }
  async function upload(kind, file, slot = kind) {
    if (!file) return;
    const invalid = scheduleFileError(file);
    if (invalid) return setError(invalid.replace("class schedule", "document"));
    setError("");
    setBusy(slot);
    setProgress("Uploading document to secure storage…");
    const abort = new AbortController();
    controller.current = abort;
    const previous = draftRef.current.documents[slot];
    let storagePath = "";
    setDocumentChecks((checks) => {
      const next = { ...checks };
      delete next[slot];
      return next;
    });
    try {
      if (!auth.user?.id)
        throw new Error(
          "Sign in again before uploading application documents.",
        );
      storagePath = await uploadTutorApplicationDocument(
        file,
        kind,
        account.name,
        auth.user.id,
      );
      if (!mounted.current) {
        if (storagePath !== previous?.storagePath)
          await removeTutorApplicationDocument(storagePath, auth.user.id);
        return;
      }
      const metadata = {
        documentType: kind,
        storagePath,
        name: file.name,
        type: file.type,
        size: file.size,
        state: "Needs Manual Review",
      };
      const next = {
        ...draftRef.current,
        documents: { ...draftRef.current.documents, [slot]: metadata },
        certified: false,
      };
      setDraft(next);
      draftRef.current = next;
      setProgress("Running local OCR and credential checks…");
      try {
        const extracted = await readTutorCredential(file, {
          signal: abort.signal,
          onProgress: (event) =>
            mounted.current &&
            setProgress(
              `Checking document: ${event.label || "Reading text"}${
                event.progress ? ` (${Math.round(event.progress * 100)}%)` : ""
              }`,
            ),
        });
        const applicant = {
          name: account.name,
          studentId: account.studentId,
          program: account.program,
          year: account.year,
          subjects: draftRef.current.subjects,
        };
        const verification = analyzeTutorCredential(
          kind,
          extracted.text,
          applicant,
        );
        if (mounted.current)
          setDocumentChecks((checks) => ({
            ...checks,
            [slot]: {
              ...verification,
              fields: extractTutorCredentialFields(
                kind,
                extracted.text,
                applicant,
              ),
              confidence: extracted.confidence,
              truncated: extracted.truncated,
              pagesRead: extracted.pagesRead,
              totalPages: extracted.totalPages,
            },
          }));
      } catch (ocrError) {
        if (mounted.current)
          setDocumentChecks((checks) => ({
            ...checks,
            [slot]: { error: ocrError.message || "Could not read this file." },
          }));
      }
      if (previous?.storagePath && previous.storagePath !== storagePath) {
        if (applicationId) obsoletePaths.current.add(previous.storagePath);
        else
          await removeTutorApplicationDocument(
            previous.storagePath,
            auth.user.id,
          ).catch((cleanupError) => {
            if (mounted.current)
              setError(
                `Document replaced, but its previous cloud copy could not be removed: ${cleanupError.message}`,
              );
          });
      }
    } catch (e) {
      const cleanupErrors = [];
      if (storagePath && storagePath !== previous?.storagePath) {
        try {
          await removeTutorApplicationDocument(storagePath, auth.user.id);
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError.message);
        }
      }
      if (mounted.current)
        setError(
          [e.message || "Could not save the document.", ...cleanupErrors].join(
            " ",
          ),
        );
    } finally {
      if (mounted.current) {
        setBusy("");
        setProgress("");
      }
    }
  }
  async function remove(kind) {
    if (busy) return;
    setBusy(kind);
    setError("");
    const documents = { ...draft.documents },
      previous = documents[kind];
    try {
      if (previous?.storagePath) {
        if (applicationId) obsoletePaths.current.add(previous.storagePath);
        else
          await removeTutorApplicationDocument(
            previous.storagePath,
            auth.user.id,
          );
      }
      delete documents[kind];
      const next = {
        ...draft,
        documents,
        certified: false,
      };
      setDraft(next);
      draftRef.current = next;
      setDocumentChecks((checks) => {
        const nextChecks = { ...checks };
        delete nextChecks[kind];
        return nextChecks;
      });
    } catch (e) {
      setError(e.message || "Could not remove the document.");
    } finally {
      setBusy("");
    }
  }
  async function preview(doc) {
    try {
      const blob = await downloadTutorApplicationDocument(
        doc.storagePath,
        auth.user.id,
      );
      const file = blob
        ? new File([blob], doc.name, { type: doc.type || blob.type })
        : null;
      if (!file)
        throw Error("Document is no longer available. Please upload it again.");
      const url = URL.createObjectURL(file),
        a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    }
  }
  async function next() {
    if (busy) return;
    setError("");
    if (step === 1 && newSubject.trim())
      return setError(
        "Click Add to include the subject you entered before continuing.",
      );
    if (step === 1 && tutoringError(draft))
      return setError(tutoringError(draft));
    if (step === 2 && documentsError(draft.documents))
      return setError(documentsError(draft.documents));
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    const invalid = applicationError(draft);
    if (invalid) return setError(invalid);
    setBusy("saving");
    try {
      const saved = await submitTutorApplication(
        draft,
        account,
        auth.user.id,
        applicationId,
      );
      const submitted = await loadMyTutorApplication(auth.user.id);
      if (!submitted || submitted.id !== saved.id)
        throw new Error(
          "The application was submitted, but could not be reloaded from Supabase. Refresh your profile or contact an administrator before submitting again.",
        );
      setApplicationId(saved.id);
      setDraft(submitted);
      draftRef.current = submitted;
      setComplete(true);
      setStatusView(true);
      persistedPaths.current = new Set(
        Object.values(submitted.documents)
          .map((document) => document.storagePath)
          .filter(Boolean),
      );
      const cleanupErrors = [];
      for (const path of obsoletePaths.current) {
        try {
          await removeTutorApplicationDocument(path, auth.user.id);
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError.message);
        }
      }
      obsoletePaths.current.clear();
      if (cleanupErrors.length)
        setError(
          `Your application was submitted, but some replaced documents could not be removed: ${cleanupErrors.join(" ")}`,
        );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  const fields = [
    ["Full Name", "name"],
    ["Student ID", "studentId"],
    ["CarSU Email", "email"],
    ["College", "college"],
    ["Program", "program"],
    ["Year Level", "year"],
  ];
  const rows = (items) => (
    <dl className="ta-summary">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "Not provided"}</dd>
        </div>
      ))}
    </dl>
  );
  const documents = (review) =>
    documentSlots(draft.documents).map((doc) => (
      <section
        className={`ta-document ${draft.documents[doc.id] ? "uploaded" : ""}`}
        key={doc.id}
      >
        <header>
          <Upload size={18} />
          <div>
            <strong>{doc.title}</strong>
            <span className="ta-badge">
              {doc.required ? "Required" : "Optional"}
            </span>
            <p>{doc.description} PDF, JPG or PNG, up to 10 MB.</p>
          </div>
          {!review && !doc.uploaded && (
            <label className="ta-upload">
              {draft.documents[doc.id] ? "Replace" : "Upload"}
              <input
                className="sr-only"
                aria-label={`Upload ${doc.title}`}
                disabled={!!busy}
                type="file"
                multiple={doc.id === "awards"}
                accept="image/png,image/jpeg,application/pdf"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = "";
                  if (doc.id === "awards") {
                    const count = Object.keys(
                      draftRef.current.documents,
                    ).filter(
                      (key) => key === "awards" || key.startsWith("awards_"),
                    ).length;
                    if (count + files.length > 10)
                      return setError(
                        "Upload up to 10 award or certificate files.",
                      );
                    for (const file of files)
                      await upload(
                        "awards",
                        file,
                        "awards_" + crypto.randomUUID(),
                      );
                  } else await upload(doc.id, files[0]);
                }}
              />
            </label>
          )}
        </header>
        {draft.documents[doc.id] && (
          <>
            <div className="ta-file">
              <button
                type="button"
                onClick={() => preview(draft.documents[doc.id])}
              >
                {draft.documents[doc.id].name}
              </button>
              <span className="ta-badge ta-badge-uploaded">Uploaded</span>
              {!review && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => remove(doc.id)}
                >
                  Remove
                </button>
              )}
            </div>
            {draft.documents[doc.id].error && (
              <p>{draft.documents[doc.id].error}</p>
            )}
            {documentChecks[doc.id]?.error ? (
              <div className="ta-ocr-result" role="status">
                <header>
                  <strong>Document verification</strong>
                  <span className="ta-ocr-status">Manual Review by Admin</span>
                </header>
                <p>
                  Your document was uploaded. An Admin will review the original
                  file manually.
                </p>
              </div>
            ) : documentChecks[doc.id] ? (
              <div
                className={`ta-ocr-result ${
                  documentChecks[doc.id].checks.some(
                    (item) => item.status === "Not Matched",
                  )
                    ? "mismatch"
                    : ""
                }`}
              >
                <header>
                  <strong>
                    Extracted information (OCR assist)
                    {Number.isFinite(documentChecks[doc.id].confidence)
                      ? ` · ${Math.round(documentChecks[doc.id].confidence)}% confidence`
                      : ""}
                  </strong>
                  <span className="ta-ocr-status">
                    {documentChecks[doc.id].checks.some(
                      (item) => item.status === "Not Matched",
                    )
                      ? "Potential mismatch — Admin must review"
                      : documentChecks[doc.id].checks.every(
                            (item) => item.status === "Matched",
                          )
                        ? "Information Match — Admin must review"
                        : "Manual Review by Admin"}
                  </span>
                </header>
                <div className="ta-ocr-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Extracted</th>
                        <th>Compared with</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentChecks[doc.id].fields.map((field) => (
                        <tr key={field.field}>
                          <td>{field.field}</td>
                          <td>{field.extracted}</td>
                          <td>{field.comparedWith}</td>
                          <td>
                            <span
                              className={`ta-ocr-pill ${
                                field.status === "Matched"
                                  ? "matched"
                                  : field.status === "Not Matched"
                                    ? "not-matched"
                                    : ""
                              }`}
                            >
                              {learnerReviewLabel(field.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {documentChecks[doc.id].truncated && (
                  <p role="status">
                    OCR checked {documentChecks[doc.id].pagesRead} of{" "}
                    {documentChecks[doc.id].totalPages} PDF pages. Review the
                    remaining pages manually.
                  </p>
                )}
                <p>
                  OCR is only an assistant. Review the original document before
                  submitting.
                </p>
              </div>
            ) : null}
          </>
        )}
        {!draft.documents[doc.id] &&
          !review &&
          draft.status === "Resubmission Required" && (
            <p className="ta-muted">
              No previously submitted file was found. Upload this document
              again.
            </p>
          )}
        {busy === doc.id && (
          <p className="ta-upload-progress" role="status">
            {progress}
          </p>
        )}
      </section>
    ));
  const resubmissionRequest = [...(draft.history || [])].reverse().find(
    (item) =>
      String(item.to || "")
        .toLowerCase()
        .replace(/[_\s]+/g, " ") === "resubmission required",
  );
  if (loading)
    return (
      <p role="status" className="p-6">
        Loading your tutor application…
      </p>
    );
  if (statusView)
    if (!draft.id)
      return (
        <section className="tutor-application">
          <h1 ref={heading} tabIndex={-1}>
            Application status unavailable
          </h1>
          <p className="ta-error" role="alert">
            No saved tutor application record was loaded from Supabase. The
            displayed draft is not a confirmed submission.
            {error ? ` ${error}` : ""}
          </p>
          <button className="ta-back" onClick={onClose}>
            <ArrowLeft size={14} />
            Back to Profile
          </button>
        </section>
      );
  if (statusView)
    return (
      <ApplicationStatus
        application={draft}
        account={account}
        onBack={onClose}
        onEdit={() => {
          setStatusView(false);
          setComplete(false);
          if (draft.status === "Rejected") {
            setApplicationId(null);
            setDraft({
              courseCode: "",
              courseDescription: "",
              gcashName: "",
              gcashNumber: "",
              subjects: [],
              topics: {},
              bio: "",
              experience: "",
              type: "",
              motivation: "",
              documents: {},
              certified: false,
            });
            setStep(0);
          } else setStep(2);
        }}
        onDocument={preview}
        error={error}
      />
    );
  return (
    <section className="tutor-application">
      <button className="ta-back" disabled={!!busy} onClick={saveDraft}>
        <ArrowLeft size={14} />
        Back to Profile
      </button>
      {complete && !statusView ? (
        <div className="ta-success">
          <span>
            <Check size={28} />
          </span>
          <h1 ref={heading} tabIndex={-1}>
            Tutor application submitted
          </h1>
          {rows([
            ["Application ID", draft.id],
            ["Submitted date", new Date(draft.date).toLocaleDateString()],
            ["Current status", draft.status],
          ])}
          <p>
            Your tutor application and documents have been submitted for Admin
            review. Tutor access is added after approval.
          </p>
          <footer>
            <button
              onClick={() => {
                onClose();
                work.go("dashboard");
              }}
            >
              Back to Dashboard
            </button>
            <button className="ta-primary" onClick={() => setStatusView(true)}>
              View Application Status
            </button>
          </footer>
        </div>
      ) : (
        <>
          <h1>Apply as Tutor</h1>
          <p className="ta-subtitle">
            An authorized Kasangga Admin reviews your application before Tutor
            capability is added to your account.
          </p>
          <div className="ta-card">
            <ol className="ta-steps">
              {STEPS.map((label, i) => (
                <li
                  key={label}
                  className={i === step ? "active" : i < step ? "done" : ""}
                  aria-current={i === step ? "step" : undefined}
                >
                  <span>{i < step ? "✓" : i + 1}</span>
                  {label}
                </li>
              ))}
            </ol>
            <div className="ta-body">
              <h2 ref={heading} tabIndex={-1}>
                {statusView ? "Application Status" : STEPS[step]}
              </h2>
              {statusView ? (
                <>
                  <p className="ta-notice">
                    Application submitted to Kasangga. Your application status
                    is shown below.
                  </p>
                  {rows([
                    ["Application ID", draft.id],
                    [
                      "Saved date",
                      new Date(draft.created).toLocaleDateString(),
                    ],
                    ["Subjects", draft.subjects.join(", ")],
                  ])}
                  <button
                    onClick={() => {
                      setStatusView(false);
                      setComplete(false);
                      setStep(1);
                    }}
                  >
                    Edit saved application
                  </button>
                </>
              ) : (
                <>
                  {step === 0 && (
                    <>
                      <p className="ta-muted">
                        This information comes from your existing Kasangga
                        account.
                      </p>
                      <div className="ta-notice">
                        <ShieldCheck size={22} />
                        <div>
                          <strong>From your Kasangga account</strong>
                          <p>
                            Institutional details cannot be changed here.
                            Contact the University Registrar to correct your
                            records.
                          </p>
                        </div>
                      </div>
                      <div className="ta-fields">
                        {fields.map(([label, key]) => (
                          <label key={key}>
                            {label}
                            <div className="ta-locked">
                              <input disabled readOnly value={account[key]} />
                              <LockKeyhole size={14} />
                            </div>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                  {step === 1 && (
                    <>
                      <div className="ta-notice blue">
                        <Info size={22} />
                        <p>
                          Add each subject you can tutor. Enter the course code
                          and description that match your academic records.
                          Complete your bio, motivation and payout details.
                          Configure session types and levels when creating a
                          service after approval.
                        </p>
                      </div>
                      <label htmlFor="application-subject">
                        Subjects / Areas of Expertise *
                      </label>
                      <div className="ta-subject-entry">
                        <input
                          id="application-subject"
                          maxLength={100}
                          list="application-subject-options"
                          value={newSubject}
                          placeholder="Enter or choose a subject"
                          onChange={(e) => setNewSubject(e.target.value)}
                        />
                        <datalist id="application-subject-options">
                          {Object.keys(SUBJECTS).map((subject) => (
                            <option key={subject} value={subject} />
                          ))}
                        </datalist>
                        <div className="ta-fields">
                          <label>
                            Course Code *
                            <input
                              maxLength={50}
                              placeholder="e.g. IT101"
                              value={draft.courseCode || ""}
                              onChange={(e) =>
                                patch("courseCode", e.target.value)
                              }
                            />
                          </label>
                          <label>
                            Course Description *
                            <textarea
                              maxLength={1000}
                              placeholder="e.g. Introduction to Programming"
                              value={draft.courseDescription || ""}
                              onChange={(e) =>
                                patch("courseDescription", e.target.value)
                              }
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const subject = newSubject.trim();
                            if (!subject)
                              return setError(
                                "Enter a subject before clicking Add.",
                              );
                            if (
                              draft.subjects.some(
                                (item) =>
                                  item.toLowerCase() === subject.toLowerCase(),
                              )
                            )
                              return setError("That subject is already added.");
                            if (draft.subjects.length >= 20)
                              return setError("Add up to 20 subjects.");
                            patch("subjects", [...draft.subjects, subject]);
                            setNewSubject("");
                          }}
                        >
                          Add
                        </button>
                      </div>
                      <p className="ta-muted">
                        Click Add for each subject. Click its chip to remove it.
                        Attach matching grades in the next step.
                      </p>
                      <div className="ta-chips">
                        {draft.subjects.map((subject) => (
                          <button
                            type="button"
                            key={subject}
                            aria-label={"Remove " + subject}
                            onClick={() => toggleSubject(subject)}
                          >
                            {subject} &times;
                          </button>
                        ))}
                      </div>
                      <div className="ta-fields">
                        {[
                          [
                            "Tutor Bio / About Me",
                            "bio",
                            400,
                            "Your academic background, skills and tutoring strengths.",
                          ],
                          [
                            "Tutoring Experience (optional)",
                            "experience",
                            1000,
                            "Previous tutoring, mentoring or peer teaching experience.",
                          ],
                        ].map(([label, key, max, placeholder]) => (
                          <label key={key}>
                            {label}
                            <textarea
                              value={draft[key]}
                              maxLength={max}
                              onChange={(e) => patch(key, e.target.value)}
                              placeholder={placeholder}
                            />
                            <small>
                              {draft[key].length}/{max}
                              {key === "bio" ? " · at least 30 characters" : ""}
                            </small>
                          </label>
                        ))}
                      </div>
                      <h3>Payout Details</h3>
                      <p className="ta-muted">
                        Use your own registered GCash account for Admin payout
                        reference. This does not enable automatic transfers.
                        Payout details are not shown on public tutor cards.
                      </p>
                      <div className="ta-fields">
                        <label>
                          GCash Account Name *
                          <input
                            maxLength={150}
                            value={draft.gcashName || ""}
                            onChange={(e) => patch("gcashName", e.target.value)}
                            placeholder="Name registered with GCash"
                          />
                        </label>
                        <label>
                          GCash Number *
                          <div className="ta-add">
                            <span>+63</span>
                            <input
                              type="tel"
                              inputMode="numeric"
                              maxLength={10}
                              value={(draft.gcashNumber || "").replace(
                                /^\+63/,
                                "",
                              )}
                              placeholder="9XXXXXXXXX"
                              onChange={(e) => {
                                let digits = e.target.value.replace(/\D/g, "");
                                if (digits.startsWith("0"))
                                  digits = digits.slice(1);
                                patch(
                                  "gcashNumber",
                                  digits ? "+63" + digits.slice(0, 10) : "",
                                );
                              }}
                            />
                          </div>
                          <small>
                            10 digits starting with 9. Double-check your account
                            name and number.
                          </small>
                        </label>
                      </div>
                      <label>
                        Reason for Applying / Motivation
                        <textarea
                          maxLength={300}
                          value={draft.motivation}
                          onChange={(e) => patch("motivation", e.target.value)}
                          placeholder="Why do you want to become a Kasangga Tutor?"
                        />
                        <small>
                          {draft.motivation.length}/300 · at least 20 characters
                        </small>
                      </label>
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <p className="ta-muted">
                        {draft.status === "Resubmission Required"
                          ? "Your previously submitted documents are listed below. Keep them as-is or replace the files that need correction."
                          : "Upload documents for an authorized Admin to review. Each file is stored in your private applicant folder."}
                      </p>
                      {draft.status === "Resubmission Required" &&
                        (resubmissionRequest?.reason ||
                          resubmissionRequest?.requestedChanges?.length >
                            0) && (
                          <div className="ta-notice ta-resubmission-request">
                            <Info size={22} />
                            <div>
                              <strong>Admin requested these updates</strong>
                              {resubmissionRequest.reason && (
                                <p>{resubmissionRequest.reason}</p>
                              )}
                              {!!resubmissionRequest.requestedChanges
                                ?.length && (
                                <ul className="ta-requested-changes">
                                  {resubmissionRequest.requestedChanges.map(
                                    (item) => (
                                      <li key={item}>{item}</li>
                                    ),
                                  )}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      <div className="ta-notice blue">
                        <Info size={22} />
                        <p>
                          Required: A current-semester COR and grades that
                          support your added subjects or expertise. CSU ID
                          upload is not required here. Awards are optional;
                          select up to 10 PDF, JPG or PNG files, at most 10 MB
                          each. Continue checks for missing documents and shows
                          a warning.
                        </p>
                      </div>
                      {documents(false)}
                      <div className="ta-notice blue">
                        <Info size={22} />
                        <p>
                          Documents require manual review by an authorized
                          Admin.
                        </p>
                      </div>
                    </>
                  )}
                  {step === 3 && (
                    <>
                      <p className="ta-muted">
                        Check everything before saving. Use Edit to correct your
                        information.
                      </p>
                      <section className="ta-review">
                        <h3>Student Information</h3>
                        {rows(
                          fields.map(([label, key]) => [label, account[key]]),
                        )}
                      </section>
                      <section className="ta-review">
                        <header>
                          <h3>Tutoring Information</h3>
                          <button onClick={() => setStep(1)}>Edit</button>
                        </header>
                        {rows([
                          ["Subjects", draft.subjects.join(", ")],
                          ["Course code", draft.courseCode],
                          ["Course description", draft.courseDescription],
                          ["GCash account name", draft.gcashName],
                          ["GCash number", draft.gcashNumber],
                          ["Tutor bio", draft.bio],
                          ["Experience", draft.experience],
                          ["Reason for applying", draft.motivation],
                        ])}
                      </section>
                      <section className="ta-review">
                        <header>
                          <h3>Uploaded Documents</h3>
                          <button onClick={() => setStep(2)}>Edit</button>
                        </header>
                        {documents(true)}
                      </section>
                      <label className="ta-certify">
                        <input
                          type="checkbox"
                          checked={draft.certified}
                          onChange={(e) =>
                            setDraft({ ...draft, certified: e.target.checked })
                          }
                        />
                        I certify that the information and documents I submitted
                        are accurate and belong to me.
                      </label>
                      <p className="ta-muted">
                        Your application and uploaded documents will be
                        submitted to Kasangga for Admin review.
                      </p>
                    </>
                  )}
                </>
              )}
              {error && (
                <p role="alert" className="ta-error">
                  {error}
                </p>
              )}
            </div>
            {!statusView && (
              <footer className="ta-footer">
                <button
                  disabled={!!busy}
                  onClick={() => (step === 0 ? saveDraft() : setStep(step - 1))}
                >
                  {step === 0 ? "Cancel" : "Back"}
                </button>
                <button disabled={!!busy} onClick={saveDraft}>
                  Exit
                </button>
                <small>
                  {step === 1
                    ? tutoringError(draft)
                    : step === 2
                      ? documentsError(draft.documents)
                      : step === 3 && !draft.certified
                        ? "Check the certification box."
                        : ""}
                </small>
                <button className="ta-primary" disabled={!!busy} onClick={next}>
                  {step === 3 ? "Save Tutor Application" : "Continue"}
                </button>
              </footer>
            )}
          </div>
        </>
      )}
      {complete && !statusView && error && <p role="alert">{error}</p>}
    </section>
  );
}
