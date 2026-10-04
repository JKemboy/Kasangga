import CaseWorkflow from "./CaseWorkflow.jsx";
import { caseDescriptions, evidenceSamples } from "./casePreviewData.js";
import { useEffect, useRef, useState } from "react";
import { X, FileText, ShieldCheck, Eye, PenLine } from "lucide-react";
import { button, primary, input } from "../tutor/workspace/ui.jsx";
import { loadOsasEvidence } from "./OsasEvidence.jsx";
import "./case-shortcuts.css";
const criteria = [
  "Readability",
  "Context Completeness",
  "Relevance to Case",
  "Source Verification",
  "Signs of Manipulation",
];
export function validateEvidence(record, result, checks, notes) {
  if (record.status === "Validated")
    throw Error("Validated evidence is read-only.");
  if (!["Validated", "Requires Clarification", "Insufficient"].includes(result))
    throw Error("Choose a validation result.");
  if (notes.trim().length < 10)
    throw Error("Enter at least 10 characters of review notes.");
  if (
    result === "Validated" &&
    !criteria.every(
      (c) =>
        checks[c] === "Meets criterion" ||
        (c === "Source Verification" && checks[c] === "Not applicable"),
    )
  )
    throw Error("Complete every criterion before validating.");
  if (
    !criteria.some(
      (c) => checks[c] === "Meets criterion" || checks[c] === "Not applicable",
    )
  )
    throw Error("Assess at least one criterion.");
  return {
    ...record,
    status: result,
    history: [
      ...(record.history || []),
      {
        status: result,
        criteria: checks,
        notes: notes.trim(),
        reviewer: "Maria Santos",
        at: new Date().toISOString(),
      },
    ],
  };
}
const Badge = ({ value }) => (
  <span
    className={`ocx-badge ${["High", "Insufficient", "Open"].includes(value) ? "red" : ["Resolved", "Validated", "Case Created", "Pending Decision"].includes(value) ? "green" : ["Referred to OSAS", "Awaiting Evidence", "Low"].includes(value) ? "blue" : "gold"}`}
  >
    {value}
  </span>
);
const Facts = ({ items }) => (
  <dl className="ocx-facts">
    {items.map(([k, v]) => (
      <div key={k}>
        <dt>{k}</dt>
        <dd>{v || "Not recorded"}</dd>
      </div>
    ))}
  </dl>
);
export default function CaseShortcut({
  record: r,
  initialView = "case",
  initialEvidenceId = null,
  onClose,
  onSave,
  onEvidenceSave,
}) {
  const [view, setView] = useState(initialView),
    [evidence, setEvidence] = useState(loadOsasEvidence),
    [evidenceId, setEvidenceId] = useState(initialEvidenceId),
    [notes, setNotes] = useState(""),
    [actionType, setActionType] = useState("Case note"),
    [error, setError] = useState(""),
    [enlarged, setEnlarged] = useState(false),
    [status, setStatus] = useState(r.status);
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  const attached = evidence.filter((e) => e.caseId === r.caseId),
    ev = attached.find((e) => e.id === evidenceId) || attached[0];
  const [checks, setChecks] = useState({}),
    [result, setResult] = useState("");
  useEffect(() => {
    const last = ev?.history?.at(-1);
    setChecks(last?.criteria || {});
    setResult(
      ["Validated", "Requires Clarification", "Insufficient"].includes(
        ev?.status,
      )
        ? ev.status
        : "",
    );
    setNotes(view === "evidence" ? last?.notes || "" : "");
  }, [ev?.id]);
  function open(next) {
    setView(next);
    setError("");
    setNotes(next === "evidence" ? ev?.history?.at(-1)?.notes || "" : "");
  }
  function saveNote(e) {
    e.preventDefault();
    if (notes.trim().length < 10) {
      setError("Enter at least 10 characters.");
      return;
    }
    const next = {
      ...r,
      history: [
        ...(r.history || []),
        {
          action: actionType,
          notes: notes.trim(),
          status: r.status,
          officer: "Maria Santos",
          at: new Date().toISOString(),
        },
      ],
    };
    if (onSave(next) === false) {
      setError("Could not save this case.");
      return;
    }
    open("case");
  }
  function saveEvidence() {
    try {
      const updated = validateEvidence(ev, result, checks, notes);
      const next = evidence.map((e) => (e.id === ev.id ? updated : e));
      localStorage.setItem(
        "campustutor:osas-evidence:v1",
        JSON.stringify(next),
      );
      setEvidence(next);
      onEvidenceSave?.(next);
      open("case");
    } catch (e) {
      setError(e.message);
    }
  }
  const reportDate = r.date
    ? new Date(r.date + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not recorded";
  const title =
    view === "case"
      ? r.caseId
      : view === "note"
        ? "Add Case Action / Note"
        : view === "incident"
          ? r.id
          : view === "status"
            ? "Update Case Status"
            : `${ev?.status === "Validated" ? "View" : "Review"} Evidence${ev ? " · " + ev.id : ""}`;
  return (
    <dialog
      ref={ref}
      className={`ocx-dialog ${view === "case" ? "ocx-drawer" : view === "incident" ? "ocx-incident" : ""} ${view === "note" || view === "status" ? "ocx-small" : ""}`}
      aria-label={title}
      onCancel={onClose}
    >
      <header>
        <div>
          <h2>
            {title}{" "}
            {view === "case" && (
              <>
                <Badge value={r.status} />
                <Badge value={r.priority} />
              </>
            )}
            {view === "incident" && (
              <Badge value={r.referral || "Case Created"} />
            )}
            {view === "evidence" && ev && <Badge value={ev.status} />}
          </h2>
          <p>
            {view === "incident" ? (
              <>Incident report ? submitted {reportDate}</>
            ) : (
              <>
                {r.type} ? {r.caseId} ? {r.date} ? {r.officer}
              </>
            )}
          </p>
        </div>
        <button
          className={button}
          aria-label="Close case shortcut"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <div className="ocx-body">
        {view === "case" && (
          <>
            <nav className="ocx-stages" aria-label="Case workflow">
              {[
                "Incident Report",
                "OSAS Referral",
                "Formal Case",
                "Evidence Validation",
                "Case Review",
                "Case Actions",
                "Case Decision",
                "Clearance Effect",
                "Resolution",
                "Archive",
              ].map((t) => (
                <span key={t} className={t === "Case Review" ? "current" : ""}>
                  {t}
                </span>
              ))}
            </nav>
            <section>
              <h3>
                <FileText size={17} />
                Case Details
              </h3>
              <Facts
                items={[
                  ["Case ID", r.caseId],
                  [
                    "Incident Report ID",
                    <button
                      className="ocx-link"
                      onClick={() => open("incident")}
                    >
                      {r.id}
                    </button>,
                  ],
                  ["Booking ID", r.booking],
                  ["Incident Type", r.type],
                  ["Priority", <Badge value={r.priority} />],
                  ["Date Opened", r.date],
                  ["Assigned OSAS", r.officer],
                  ["Status", <Badge value={r.status} />],
                ]}
              />
            </section>
            <section>
              <h3>Parties</h3>
              <Facts
                items={[
                  ["Reporter", r.reporter],
                  ["Reported Student", r.student],
                ]}
              />
              <p className="ocx-muted">
                Respondent. A report does not establish a finding.
              </p>
            </section>
            <section>
              <h3>Incident Description</h3>
              <p className="ocx-warning">
                <b>ALLEGATION AS REPORTED · NOT A FINDING</b>
                <br />
                {r.description ||
                  caseDescriptions[r.caseId] ||
                  "The source narrative is not attached to this sample case."}
              </p>
            </section>
            <section>
              <h3>Evidence Summary ({attached.length})</h3>
              {attached.map((e) => (
                <button
                  className="ocx-evidence-row"
                  key={e.id}
                  onClick={() => {
                    setEvidenceId(e.id);
                    open("evidence");
                  }}
                >
                  <ShieldCheck size={19} />
                  <span>
                    <b>{e.id}</b> · {e.evidenceType}
                    <small>
                      {e.reporter} · {e.date}
                    </small>
                  </span>
                  <Badge value={e.status} />
                </button>
              ))}
            </section>
            <section>
              <h3>Case Timeline</h3>
              <ol className="ocx-timeline">
                <li>
                  <b>Formal case opened</b>
                  <small>
                    {r.date} ? {r.officer}
                  </small>
                </li>
                {(r.history || []).map((h, i) => (
                  <li key={i}>
                    <b>{h.action || h.status}</b>
                    <small>
                      {h.at} ? {h.officer}
                    </small>
                    <p>{h.notes}</p>
                  </li>
                ))}
              </ol>
            </section>
            {r.decision && (
              <section className="ocx-decision">
                <h3>Case Decision</h3>
                <Facts
                  items={[
                    ["Outcome", r.decision.outcome],
                    [
                      "Resolution",
                      r.decision.condition && !r.decision.conditionDone
                        ? "Resolved ? Conditions Pending"
                        : "Resolved",
                    ],
                    ["Decision basis", r.decision.notes],
                    ["Policy reference", r.decision.basis],
                    ["Condition", r.decision.condition || "None"],
                    ["Due date", r.decision.due || "Not applicable"],
                    [
                      "Condition status",
                      r.decision.conditionDone ? "Completed" : "Pending",
                    ],
                    ["Recorded", r.decision.at],
                  ]}
                />
              </section>
            )}
            <section>
              <h3>
                OSAS Notes ({r.history?.filter((h) => h.notes).length || 0})
              </h3>
              {r.history?.length ? (
                r.history.map((h, i) => (
                  <article key={i}>
                    <b>{h.action || h.status}</b>
                    <p>{h.notes}</p>
                    <small>
                      {h.officer} · {h.at}
                    </small>
                  </article>
                ))
              ) : (
                <p>No actions recorded yet.</p>
              )}
            </section>
          </>
        )}
        {view === "note" && (
          <form id="ocx-note" onSubmit={saveNote}>
            <label>
              Action type
              <select
                className={input}
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
              >
                {[
                  "Case note",
                  "Follow-up",
                  "Documentation",
                  "Participant contact",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Details
              <textarea
                className={input}
                rows={5}
                maxLength={4000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the action neutrally. Refer to allegations as allegations."
              />
            </label>
            <small>
              {notes.trim().length}/10 characters minimum · saved locally to the
              case record
            </small>
          </form>
        )}
        {view === "status" && (
          <>
            <label>
              Case status
              <select
                className={input}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {[
                  "Open",
                  "Under Review",
                  "Awaiting Evidence",
                  "Pending Decision",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <textarea
                className={input}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </>
        )}
        {view === "incident" && (
          <>
            <div className="ocx-warning ocx-report-notice">
              <FileText size={22} />
              <div>
                <b>INCIDENT REPORT</b>
                <p>
                  A submitted allegation or concern. It is not a finding and
                  does not imply that the reported student committed misconduct.
                </p>
              </div>
            </div>
            <Facts
              items={[
                ["Incident Report ID", r.id],
                ["Related Booking ID", r.booking],
                ["Reporter", r.reporter],
                ["Reported Student", r.student],
                ["Incident Type", r.type],
                ["Priority", <Badge value={r.priority} />],
                ["Submitted Date", reportDate],
                [
                  "Referral Status",
                  <Badge value={r.referral || "Case Created"} />,
                ],
                ["Current Status", <Badge value={r.status} />],
              ]}
            />
            <h3>Reported concern</h3>
            <p className="ocx-warning">
              <strong className="ocx-report-label">
                AS SUBMITTED BY THE REPORTER
              </strong>
              {r.description ||
                caseDescriptions[r.caseId] ||
                "Original report narrative not attached to this sample."}
            </p>
            <h3>Evidence attached to the report ({attached.length})</h3>
            {!attached.length && <p className="ocx-muted">None.</p>}
            {attached.map((e) => (
              <button
                key={e.id}
                className="ocx-evidence-row"
                onClick={() => {
                  setEvidenceId(e.id);
                  open("evidence");
                }}
              >
                {e.id} · {e.evidenceType}
                <Badge value={e.status} />
              </button>
            ))}
            <h3>Formal OSAS case</h3>
            <div className="ocx-formal-case">
              <ShieldCheck size={24} />
              <div>
                <b>{r.caseId}</b> ? FORMAL OSAS CASE
                <small>
                  Opened after referral and OSAS assessment ? {r.status} ?
                  Assigned to {r.officer || "Not recorded"}
                </small>
              </div>
              <button className={button} onClick={() => open("case")}>
                Open case
              </button>
            </div>
          </>
        )}
        {view === "evidence" &&
          (!ev ? (
            <p>No evidence is attached to this case.</p>
          ) : (
            <>
              <div className="ocx-evidence-grid">
                <div>
                  <h3>
                    Evidence Preview{" "}
                    <button
                      className="ocx-link"
                      onClick={() => setEnlarged(!enlarged)}
                    >
                      <Eye size={15} />
                      {enlarged ? "Reduce" : "Enlarge"}
                    </button>
                  </h3>
                  <div className={`ocx-preview ${enlarged ? "large" : ""}`}>
                    <div className="ocx-sample">
                      <b>{ev.evidenceType}</b>
                      {evidenceSamples[ev.id]?.lines.map((line, i) => (
                        <p key={i}>{line}</p>
                      )) || <p>Original evidence file not attached.</p>}
                    </div>
                    <small>
                      Illustrative demo preview from the supplied design.
                      Original source file not attached.
                    </small>
                  </div>
                  <p className="ocx-warning">
                    Evidence requires manual review. Submission alone does not establish misconduct.
                  </p>
                </div>
                <div>
                  <Facts
                    items={[
                      ["Evidence ID", ev.id],
                      [
                        "Case ID",
                        <button
                          className="ocx-link"
                          onClick={() => open("case")}
                        >
                          {r.caseId}
                        </button>,
                      ],
                      ["Incident Report ID", ev.reportId],
                      ["Submitted By", ev.reporter],
                      ["Evidence Type", ev.evidenceType],
                      ["Submission Date", `${ev.date} · ${ev.time}`],
                      ["File", ev.fileName || evidenceSamples[ev.id]?.file],
                    ]}
                  />
                  <h3>
                    {ev.status === "Validated"
                      ? "Recorded validation"
                      : "Reviewer checklist"}
                  </h3>
                  {ev.status === "Validated" && (
                    <p className="ocx-warning">
                      Read-only validation.{" "}
                      {ev.history?.at(-1)?.reviewer ||
                        "Supporting reviewer information not recorded."}
                    </p>
                  )}
                  {criteria.map((c) => (
                    <div className="ocx-check" key={c}>
                      <label>
                        <input
                          type="checkbox"
                          disabled={ev.status === "Validated"}
                          checked={checks[c] === "Meets criterion"}
                          onChange={(e) =>
                            setChecks({
                              ...checks,
                              [c]: e.target.checked
                                ? "Meets criterion"
                                : "Not assessed",
                            })
                          }
                        />
                        {c}
                      </label>
                      {c === "Source Verification" &&
                        ev.status !== "Validated" && (
                          <button
                            className="ocx-link"
                            onClick={() =>
                              setChecks({
                                ...checks,
                                [c]:
                                  checks[c] === "Not applicable"
                                    ? "Not assessed"
                                    : "Not applicable",
                              })
                            }
                          >
                            {checks[c] === "Not applicable"
                              ? "Marked not applicable · Undo"
                              : "Mark not applicable"}
                          </button>
                        )}
                    </div>
                  ))}
                  {ev.status !== "Validated" && (
                    <>
                      <h3>Validation result</h3>
                      <div className="ocx-results">
                        {[
                          "Validated",
                          "Requires Clarification",
                          "Insufficient",
                        ].map((v) => (
                          <button
                            className={result === v ? primary : button}
                            key={v}
                            aria-pressed={result === v}
                            onClick={() => setResult(v)}
                            disabled={
                              v === "Validated" &&
                              !criteria.every(
                                (c) =>
                                  checks[c] === "Meets criterion" ||
                                  (c === "Source Verification" &&
                                    checks[c] === "Not applicable"),
                              )
                            }
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <label>
                        Review Notes (required)
                        <textarea
                          className={input}
                          rows={4}
                          maxLength={2000}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </label>
                    </>
                  )}
                  {ev.status === "Validated" && (
                    <p>
                      {ev.history?.at(-1)?.notes ||
                        "Validation notes not recorded in this sample."}
                    </p>
                  )}
                </div>
              </div>
            </>
          ))}
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
      </div>
      <footer>
        {view === "case" ? (
          <>
            <button
              className={button}
              disabled={r.archived}
              onClick={() => open("note")}
            >
              <PenLine size={15} />
              Add Case Action/Note
            </button>
            <button className={button} onClick={() => open("evidence")}>
              Review Evidence
            </button>
            <CaseWorkflow record={r} evidence={attached} onSave={onSave} />
          </>
        ) : view === "incident" ? (
          <button className={primary} onClick={onClose}>
            Close
          </button>
        ) : (
          <>
            <button className={button} onClick={onClose}>
              Close
            </button>
            <button className={button} onClick={() => open("case")}>
              Open Case
            </button>
            {view === "note" && (
              <button
                className={primary}
                form="ocx-note"
                disabled={notes.trim().length < 10}
              >
                Save to Case Record
              </button>
            )}
            {view === "evidence" && ev && ev.status !== "Validated" && (
              <button
                className={primary}
                onClick={saveEvidence}
                disabled={!result || notes.trim().length < 10}
              >
                Save Validation
              </button>
            )}
            {view === "status" && (
              <button
                className={primary}
                disabled={notes.trim().length < 10}
                onClick={() => {
                  if (
                    onSave({
                      ...r,
                      status,
                      history: [
                        ...(r.history || []),
                        {
                          status,
                          notes: notes.trim(),
                          officer: "Maria Santos",
                          at: new Date().toISOString(),
                        },
                      ],
                    }) === false
                  )
                    setError("Could not save.");
                  else open("case");
                }}
              >
                Save Status
              </button>
            )}
          </>
        )}
      </footer>
    </dialog>
  );
}
