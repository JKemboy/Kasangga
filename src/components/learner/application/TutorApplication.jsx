import ApplicationStatus from "./ApplicationStatus.jsx";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  LockKeyhole,
  ShieldCheck,
  Upload,
  Info,
} from "lucide-react";
import { useLearnerWorkspace } from "../workspace/LearnerWorkspace.jsx";
import {
  scheduleFileStore,
  scheduleFileError,
} from "../../tutor/workspace/scheduleUploads.js";
import {
  SUBJECTS,
  DOCUMENTS,
  tutoringError,
  documentsError,
  applicationError,
} from "./applicationRules.js";
import "./tutor-application.css";
const STEPS = [
  "Verify Student Information",
  "Tutoring Information",
  "Verification Documents",
  "Review & Submit",
];
export default function TutorApplication({ onClose }) {
  const work = useLearnerWorkspace();
  const account = {
    name: work.data.profile.name || "",
    studentId: work.data.profile.studentId || "",
    email: work.data.profile.email || "",
    college: work.data.profile.college || "",
    program: work.data.profile.program || "",
    year: work.data.profile.year || "",
  };
  const [draft, setDraft] = useState(() => ({
    subjects: [],
    topics: {},
    bio: "",
    experience: "",
    type: "",
    motivation: "",
    documents: {},
    certified: false,
    ...(work.data.application?.version === 2 ? work.data.application : {}),
  }));
  const [step, setStep] = useState(0),
    [complete, setComplete] = useState(
      work.data.application?.status === "Saved locally",
    ),
    [statusView, setStatusView] = useState(
      work.data.application?.status === "Saved locally",
    ),
    [custom, setCustom] = useState({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [progress, setProgress] = useState("");
  const controller = useRef(null),
    mounted = useRef(true),
    heading = useRef(null),
    draftRef = useRef(draft);
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
  function toggleTopic(subject, topic) {
    const old = draft.topics[subject] || [];
    patch("topics", {
      ...draft.topics,
      [subject]: old.includes(topic)
        ? old.filter((t) => t !== topic)
        : [...old, topic],
    });
  }
  function saveDraft() {
    if (complete) {
      onClose();
      return;
    }
    const next = {
      ...draft,
      version: 2,
      status: "Draft",
      updated: new Date().toISOString(),
    };
    if (!work.commit((d) => ({ ...d, application: next })))
      return setError("Could not save the draft on this browser.");
    onClose();
  }
  async function upload(kind, file) {
    if (!file) return;
    const invalid = scheduleFileError(file);
    if (invalid) return setError(invalid.replace("class schedule", "document"));
    setError("");
    setBusy(kind);
    setProgress("Saving document…");
    const abort = new AbortController();
    controller.current = abort;
    const storageId = "tutor-application:" + crypto.randomUUID();
    let saved = false;
    try {
      await scheduleFileStore.save(storageId, file);
      saved = true;
      if (!mounted.current) {
        await scheduleFileStore.remove(storageId);
        return;
      }
      const metadata = {
        storageId,
        name: file.name,
        type: file.type,
        size: file.size,
        state: "Needs Manual Review",
      };
      const next = {
        ...draftRef.current,
        documents: { ...draftRef.current.documents, [kind]: metadata },
        certified: false,
        version: 2,
        status: "Draft",
      };
      if (!work.commit((d) => ({ ...d, application: next }))) {
        await scheduleFileStore.remove(storageId);
        return setError("Could not save document details. Try again.");
      }
      const previous = draftRef.current.documents[kind];
      setDraft(next);
      if (previous?.storageId)
        await scheduleFileStore.remove(previous.storageId).catch(() => {});
    } catch (e) {
      if (saved) await scheduleFileStore.remove(storageId).catch(() => {});
      if (mounted.current)
        setError(e.message || "Could not save the document.");
    } finally {
      if (mounted.current) {
        setBusy("");
        setProgress("");
      }
    }
  }
  async function remove(kind) {
    const documents = { ...draft.documents },
      previous = documents[kind];
    delete documents[kind];
    const next = {
      ...draft,
      documents,
      certified: false,
      version: 2,
      status: "Draft",
    };
    if (!work.commit((d) => ({ ...d, application: next })))
      return setError("Could not remove the document.");
    setDraft(next);
    await scheduleFileStore.remove(previous.storageId).catch(() => {});
  }
  async function preview(doc) {
    try {
      const file = await scheduleFileStore.load(doc.storageId);
      if (!file)
        throw Error(
          "Document no longer exists on this browser. Please upload it again.",
        );
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
    setError("");
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
      for (const d of DOCUMENTS.filter((d) => d.required)) {
        if (!(await scheduleFileStore.load(draft.documents[d.id].storageId)))
          throw Error(
            "A required document is missing. Return to Documents and upload it again.",
          );
      }
      const saved = {
        ...draft,
        version: 2,
        id: draft.id || "LOCAL-" + crypto.randomUUID(),
        status: "Saved locally",
        created: new Date().toISOString(),
        account,
      };
      if (!work.commit((d) => ({ ...d, application: saved })))
        throw Error("Could not save your application. Please try again.");
      setDraft(saved);
      setComplete(true);
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
    DOCUMENTS.map((doc) => (
      <section className="ta-document" key={doc.id}>
        <header>
          <Upload size={18} />
          <div>
            <strong>{doc.title}</strong>
            <span className="ta-badge">
              {doc.required ? "Required" : "Optional"}
            </span>
            <p>{doc.description} PDF, JPG or PNG, up to 10 MB.</p>
          </div>
          {!review && (
            <label className="ta-upload">
              {draft.documents[doc.id] ? "Replace" : "Upload"}
              <input
                className="sr-only"
                aria-label={`Upload ${doc.title}`}
                disabled={!!busy}
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                onChange={(e) => {
                  upload(doc.id, e.target.files?.[0]);
                  e.target.value = "";
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
              <span className="ta-badge">Needs Manual Review</span>
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

          </>
        )}
        {busy === doc.id && <p role="status">{progress}</p>}
      </section>
    ));
  if (statusView)
    return (
      <ApplicationStatus
        application={draft}
        account={account}
        onBack={onClose}
        onEdit={() => {
          setStatusView(false);
          setComplete(false);
          setStep(1);
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
            Tutor application saved
          </h1>
          {rows([
            ["Application ID", draft.id],
            ["Saved date", new Date(draft.created).toLocaleDateString()],
            ["Current status", "Saved locally"],
          ])}
          <p>
            Your application and documents are saved on this browser. Admin
            submission is not connected yet; tutor access has not been enabled.
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
            An authorized CampusTutor Admin reviews your application before
            Tutor capability is added to your account.
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
                    Saved locally. Awaiting connection to the application
                    submission service.
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
                        This information comes from your existing CampusTutor
                        account.
                      </p>
                      <div className="ta-notice">
                        <ShieldCheck size={22} />
                        <div>
                          <strong>From your CampusTutor account</strong>
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
                              <input readOnly value={account[key]} />
                              <LockKeyhole size={14} />
                            </div>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                  {step === 1 && (
                    <>
                      <label>
                        Subjects / Areas of Expertise{" "}
                        <small> · choose one or more</small>
                      </label>
                      <div className="ta-chips">
                        {Object.keys(SUBJECTS).map((s) => (
                          <button
                            type="button"
                            key={s}
                            aria-pressed={draft.subjects.includes(s)}
                            onClick={() => toggleSubject(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <label>Specific Skills / Topics</label>
                      {!draft.subjects.length && (
                        <p className="ta-muted">
                          Choose a subject first to add its topics.
                        </p>
                      )}
                      <div className="ta-topic-grid">
                        {draft.subjects.map((s) => (
                          <section className="ta-topic" key={s}>
                            <strong>{s}</strong>
                            <small>
                              {" "}
                              · {(draft.topics[s] || []).length} selected
                            </small>
                            <div className="ta-chips">
                              {[
                                ...new Set([
                                  ...SUBJECTS[s],
                                  ...(draft.topics[s] || []),
                                ]),
                              ].map((t) => (
                                <button
                                  type="button"
                                  key={t}
                                  aria-pressed={
                                    draft.topics[s]?.includes(t) || false
                                  }
                                  onClick={() => toggleTopic(s, t)}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                            <div className="ta-add">
                              <input
                                aria-label={`Another ${s} topic`}
                                maxLength={80}
                                value={custom[s] || ""}
                                placeholder={`Add another ${s} topic`}
                                onChange={(e) =>
                                  setCustom({ ...custom, [s]: e.target.value })
                                }
                              />
                              <button
                                type="button"
                                disabled={!custom[s]?.trim()}
                                onClick={() => {
                                  const t = custom[s].trim();
                                  if (
                                    !draft.topics[s]?.some(
                                      (v) =>
                                        v.toLowerCase() === t.toLowerCase(),
                                    )
                                  )
                                    patch("topics", {
                                      ...draft.topics,
                                      [s]: [...(draft.topics[s] || []), t],
                                    });
                                  setCustom({ ...custom, [s]: "" });
                                }}
                              >
                                + Add
                              </button>
                            </div>
                          </section>
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
                      <label>Preferred Session Type</label>
                      <div className="ta-chips">
                        {["Online", "In-Person", "Both"].map((t) => (
                          <button
                            type="button"
                            key={t}
                            aria-pressed={draft.type === t}
                            onClick={() => patch("type", t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <label>
                        Reason for Applying / Motivation
                        <textarea
                          maxLength={300}
                          value={draft.motivation}
                          onChange={(e) => patch("motivation", e.target.value)}
                          placeholder="Why do you want to become a CampusTutor Tutor?"
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
                        Upload documents for an authorized Admin to review.
                      </p>
                      {documents(false)}
                      <div className="ta-notice blue">
                        <Info size={22} />
                        <p>
                          Documents require manual review by an authorized Admin.
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
                          [
                            "Specific topics",
                            draft.subjects
                              .map(
                                (s) =>
                                  `${s}: ${(draft.topics[s] || []).join(", ") || "None selected"}`,
                              )
                              .join("; "),
                          ],
                          ["Tutor bio", draft.bio],
                          ["Experience", draft.experience],
                          ["Session type", draft.type],
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
                        This saves your application locally. Admin submission is
                        not connected yet.
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
                  Save for later
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
                <button
                  className="ta-primary"
                  disabled={
                    !!busy ||
                    (step === 1
                      ? !!tutoringError(draft)
                      : step === 2
                        ? !!documentsError(draft.documents)
                        : step === 3
                          ? !!applicationError(draft)
                          : false)
                  }
                  onClick={next}
                >
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
