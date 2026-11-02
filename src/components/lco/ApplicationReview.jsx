import { approvalChecksComplete } from "../../services/applicationApproval.js";
import ApplicationDecision from "./ApplicationDecision.jsx";
import { useEffect, useRef, useState } from "react";
import {
  X,
  FileText,
  Check,
  Save,
  RotateCcw,
  Download,
  Eye,
  ScanLine,
  LoaderCircle,
} from "lucide-react";
import { button, primary, input } from "../tutor/workspace/ui.jsx";
import { dateLabel } from "./lcoData.js";
import {
  analyzeTutorCredential,
  extractTutorCredentialFields,
  readTutorCredential,
} from "../../services/tutorCredentialVerification.js";
import { DOCUMENTS } from "../learner/application/applicationRules.js";
import "./application-review.css";

const documentLabel = (kind) => {
  if (/^student.?id$/i.test(kind)) return "Student ID";
  if (kind === "enrollment") return "COR";
  if (kind === "grades") return "Academic Record";
  if (/^awards(?:_|$)/i.test(kind)) return "Awards";
  return DOCUMENTS.find((item) => item.id === kind)?.title || "Document";
};

export default function ApplicationReview({
  application: r,
  account,
  config,
  onSave,
  onClose,
  onDocument,
  verificationState,
  onVerificationUpdate,
}) {
  const ref = useRef(null);
  const [notes, setNotes] = useState(r.notes || "");
  const [message, setMessage] = useState("");
  const [decision, setDecision] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentPreview, setDocumentPreview] = useState({
    url: "",
    error: "",
    loading: false,
  });
  const [openedPaths, setOpenedPaths] = useState([]);
  const [ocrResults, setOcrResults] = useState({});
  const [ocrBusy, setOcrBusy] = useState("");
  const [ocrProgress, setOcrProgress] = useState(null);
  const [ocrErrors, setOcrErrors] = useState({});
  const [ocrMessage, setOcrMessage] = useState("");
  const [localVerificationState, setLocalVerificationState] =
    useState(verificationState);
  const viewerRef = useRef(null);
  const final = ["Approved", "Rejected"].includes(r.status);
  const currentVerificationState = verificationState ?? localVerificationState;
  const manual = currentVerificationState?.manualReview || {};
  function updateManual(key, value) {
    const next = {
      ...currentVerificationState,
      manualReview: { ...manual, [key]: value },
    };
    setLocalVerificationState(next);
    onVerificationUpdate?.(next);
  }
  const canApprove =
    approvalChecksComplete(r, currentVerificationState) &&
    notes.trim().length >= 15;
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  async function save(status) {
    if (busy) return;
    if (status && !notes.trim()) {
      setMessage("Enter review notes before recording a decision.");
      return;
    }
    const next = {
      ...r,
      notes: notes.trim(),
      ...(status
        ? {
            status,
            history: [
              ...(r.history || []),
              {
                from: r.status,
                to: status,
                reason: notes.trim(),
                at: new Date().toISOString(),
                by: "LCO User",
              },
            ],
          }
        : {}),
    };
    setBusy(true);
    try {
      await onSave(next, status || null);
      setDecision("");
      setMessage(status ? "Application review saved." : "Note saved.");
    } catch (error) {
      setMessage(error.message || "Could not save the application review.");
    } finally {
      setBusy(false);
    }
  }
  async function saveTutorDecision(next) {
    await onSave(next, next.status);
    setMessage("Application review saved.");
  }
  const pill = (value) => (
    <span
      className={`au-status ${["Matched", "Approved", "Active"].includes(value) ? "active" : "restricted"}`}
    >
      {value}
    </span>
  );
  const facts = [
    ["Application ID", r.id],
    ["Applicant", r.name],
    ["Student ID", r.studentId],
    ["CSU Email", r.email || account?.email],
    ["College", r.college],
    ["Program", r.program],
    ["Year Level", r.year],
    ["Submitted Date", dateLabel(r.date)],
    ["Course Code", r.courseCode],
    ["Course Description", r.courseDescription],
    ["GCash Account Name", r.gcashName],
    ["GCash Number", r.gcashNumber],
    ["Subjects", r.subjects?.join(", ")],
    [
      "Current roles",
      account ? (account.tutor ? "Learner, Tutor" : "Learner") : null,
    ],
    ["Account status", account?.status],
  ];
  const docs = Object.entries(r.documents || {});
  const verificationComplete =
    currentVerificationState?.documentStatus === "Complete";
  function confirmInformationMatch() {
    if (!verificationComplete || currentVerificationState?.matchConfirmed)
      return;
    const next = {
      ...currentVerificationState,
      matchConfirmed: true,
    };
    setLocalVerificationState(next);
    onVerificationUpdate?.(next);
    setOcrMessage(
      "Information match confirmed by LCO. You may now approve after reviewing the original documents.",
    );
  }
  async function verifyAllDocuments() {
    if (ocrBusy || !docs.length) return;
    setOcrBusy("all");
    setOcrProgress({ current: 0, total: docs.length, label: "Starting…" });
    setOcrResults({});
    setOcrErrors({});
    setOcrMessage("");
    const checkedPaths = new Set();
    const failedPaths = new Set();
    try {
      for (const [index, [kind, doc]] of docs.entries()) {
        const key = `${kind}:${doc.storagePath}`;
        setOcrProgress({
          current: index + 1,
          total: docs.length,
          label: `${doc.name}: loading document…`,
        });
        try {
          const blob = await onDocument(doc);
          if (!blob) throw new Error("The document could not be loaded.");
          const file = new File([blob], doc.name, {
            type: doc.type || blob.type,
          });
          const extracted = await readTutorCredential(file, {
            onProgress: (event) =>
              setOcrProgress({
                current: index + 1,
                total: docs.length,
                label: `${doc.name}: ${event.label || "Reading text"}${
                  event.progress
                    ? ` (${Math.round(event.progress * 100)}%)`
                    : ""
                }`,
              }),
          });
          const verification = analyzeTutorCredential(
            doc.documentType || kind,
            extracted.text,
            {
              name: r.name || account?.name,
              studentId: r.studentId || account?.studentId,
            },
          );
          setOcrResults((previous) => ({
            ...previous,
            [key]: {
              ...verification,
              fields: extractTutorCredentialFields(
                doc.documentType || kind,
                extracted.text,
                {
                  name: r.name || account?.name,
                  studentId: r.studentId || account?.studentId,
                  program: r.program || account?.program,
                },
              ),
              confidence: extracted.confidence,
              pagesRead: extracted.pagesRead,
              totalPages: extracted.totalPages,
              truncated: extracted.truncated,
            },
          }));
          checkedPaths.add(doc.storagePath);
        } catch (error) {
          failedPaths.add(doc.storagePath);
          setOcrErrors((previous) => ({
            ...previous,
            [key]: error.message || "Could not analyze this document.",
          }));
        }
      }
      const requiredPresent = DOCUMENTS.filter(
        (document) => document.required,
      ).every((document) => r.documents?.[document.id]?.storagePath);
      const everyUploadedDocumentChecked =
        docs.length > 0 &&
        docs.every(
          ([, doc]) =>
            checkedPaths.has(doc.storagePath) &&
            !failedPaths.has(doc.storagePath),
        );
      const documentStatus =
        requiredPresent && everyUploadedDocumentChecked
          ? "Complete"
          : "Incomplete";
      const nextVerification = {
        checksRun: true,
        documentStatus,
        matchConfirmed: false,
      };
      setLocalVerificationState(nextVerification);
      onVerificationUpdate?.(nextVerification);
      if (r.status === "Pending") {
        const at = new Date().toISOString();
        const next = {
          ...r,
          status: "Under Review",
          history: [
            ...(r.history || []),
            {
              from: r.status,
              to: "Under Review",
              reason: "Document checks completed. Awaiting LCO decision.",
              at,
              by: "LCO User",
            },
          ],
        };
        await onSave(next, "Under Review");
      }
      setOcrMessage(
        documentStatus === "Complete"
          ? "All required documents were checked. Confirm Information Match beside the check button after reviewing the original files."
          : "Document checks finished, but one or more required documents are missing or could not be checked.",
      );
    } catch (error) {
      setOcrMessage(
        `Document checks finished, but the application status could not be updated: ${error.message || "Please try again."}`,
      );
    } finally {
      setOcrBusy("");
      setOcrProgress(null);
    }
  }
  useEffect(() => {
    const dialog = viewerRef.current;
    if (!viewingDocument || !dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, [viewingDocument]);
  useEffect(() => {
    if (!viewingDocument) {
      setDocumentPreview({ url: "", error: "", loading: false });
      return;
    }
    let active = true;
    let objectUrl = "";
    setDocumentPreview({ url: "", error: "", loading: true });
    async function loadPreviews() {
      try {
        const blob = await onDocument(viewingDocument.doc);
        if (!blob) throw new Error("The document preview could not be loaded.");
        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setDocumentPreview({ url: objectUrl, error: "", loading: false });
          setOpenedPaths((paths) => [
            ...new Set([...paths, viewingDocument.doc.storagePath]),
          ]);
        } else URL.revokeObjectURL(objectUrl);
      } catch (error) {
        if (active)
          setDocumentPreview({
            url: "",
            error: error.message || "Could not load document.",
            loading: false,
          });
      }
    }
    loadPreviews();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [viewingDocument]);
  function downloadPreview() {
    if (!documentPreview.url || !viewingDocument) return;
    const link = document.createElement("a");
    link.href = documentPreview.url;
    link.download = viewingDocument.doc.name;
    link.click();
  }
  return (
    <dialog
      ref={ref}
      className="lco-application-review"
      aria-labelledby="application-review-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
    >
      <header>
        <div>
          <h2 id="application-review-title">
            {r.id} {pill(r.status)}
          </h2>
          <p>
            {r.type || "Tutor application"} · submitted {dateLabel(r.date)}
          </p>
        </div>
        <button
          className={button}
          aria-label="Close application review"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </header>
      <div className="aar-body">
        <dl className="aar-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "Not provided"}</dd>
            </div>
          ))}
        </dl>
        <div className="aar-columns">
          <section>
            <h3>Documents</h3>
            {docs.length ? (
              docs.map(([kind, doc]) => (
                <div className="aar-document" key={kind}>
                  <FileText size={24} />
                  <div>
                    <strong>{documentLabel(kind)}</strong>
                    {ocrErrors[`${kind}:${doc.storagePath}`] && (
                      <p className="text-red-700" role="alert">
                        {ocrErrors[`${kind}:${doc.storagePath}`]}
                      </p>
                    )}
                  </div>
                  <button
                    className={button}
                    onClick={() => setViewingDocument({ kind, doc })}
                  >
                    <Eye size={14} />
                    View
                  </button>
                </div>
              ))
            ) : (
              <p>No documents uploaded.</p>
            )}
            {!!docs.length && (
              <div className="aar-ocr-batch">
                {r.status !== "Approved" && (
                  <div className="aar-ocr-batch-actions">
                    <button
                      className={primary}
                      disabled={!!ocrBusy}
                      onClick={verifyAllDocuments}
                    >
                      {ocrBusy ? (
                        <LoaderCircle
                          className="aar-spin"
                          size={14}
                          aria-hidden="true"
                        />
                      ) : (
                        <ScanLine size={14} />
                      )}
                      {ocrBusy
                        ? "Checking documents…"
                        : "Run All Document Checks"}
                    </button>
                    <button
                      className={button}
                      disabled={
                        !!ocrBusy ||
                        !verificationComplete ||
                        !!currentVerificationState?.matchConfirmed
                      }
                      title={
                        currentVerificationState?.matchConfirmed
                          ? "Information match confirmed"
                          : "Run all document checks before confirming"
                      }
                      onClick={confirmInformationMatch}
                    >
                      {currentVerificationState?.matchConfirmed
                        ? "Information Match Confirmed"
                        : "Confirm Information Match"}
                    </button>
                  </div>
                )}
                {ocrBusy && ocrProgress && (
                  <p role="status">
                    Document {ocrProgress.current} of {ocrProgress.total}:{" "}
                    {ocrProgress.label}
                  </p>
                )}
                {ocrMessage && (
                  <p role="status" aria-live="polite">
                    {ocrMessage}
                  </p>
                )}
              </div>
            )}
            <h3>OCR confidence</h3>
            {(() => {
              const measured = Object.values(ocrResults)
                .map((result) => result.confidence)
                .filter(Number.isFinite);
              const confidence = measured.length
                ? measured.reduce((sum, value) => sum + value, 0) /
                  measured.length
                : null;
              return (
                <div className="aar-confidence-panel">
                  <div
                    className="aar-meter"
                    role="progressbar"
                    aria-label="Document OCR confidence"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={
                      confidence == null ? undefined : Math.round(confidence)
                    }
                  >
                    <div style={{ width: (confidence ?? 0) + "%" }} />
                  </div>
                  <p className="aar-muted">
                    {confidence == null
                      ? "Run document checks to measure OCR confidence."
                      : Math.round(confidence) + "% document OCR confidence"}
                  </p>
                  <p className="aar-muted">
                    OCR is decision support only; it does not prove a document
                    is authentic.
                  </p>
                </div>
              );
            })()}
            <h3>Data / Regex match</h3>
            <table>
              <tbody>
                {[
                  [
                    "Student ID format",
                    /^\d{3,4}-\d{4,8}$/.test(
                      String(r.studentId || "").replace(/\s/g, ""),
                    )
                      ? "Matched"
                      : "Not Matched",
                  ],
                  [
                    "CSU email domain",
                    r.email || account?.email
                      ? /@carsu\.edu\.ph$/i.test(r.email || account.email)
                        ? "Matched"
                        : "Not Matched"
                      : "Unavailable",
                  ],
                ].map(([label, result]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{pill(result)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="aar-review-summary">
            <h3>Extracted information vs student record</h3>
            {!Object.values(ocrResults).some(
              (result) => result.fields?.length,
            ) && (
              <p className="aar-muted">
                Run document checks to compare extracted information with the
                student record. Review the original files before making a
                decision.
              </p>
            )}
            {docs.map(([kind, doc]) => {
              const result = ocrResults[`${kind}:${doc.storagePath}`];
              if (!result?.fields?.length) return null;
              return (
                <div className="aar-comparison" key={kind}>
                  <h4>{doc.name}</h4>
                  <div className="aar-comparison-scroll">
                    <table aria-label={doc.name + " extracted information"}>
                      <thead>
                        <tr>
                          {["Field", "Extracted (OCR)", "Record", "Result"].map(
                            (label) => (
                              <th key={label} scope="col">
                                {label}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {result.fields.map((field) => (
                          <tr key={field.field}>
                            <th scope="row">{field.field}</th>
                            <td>{field.extracted}</td>
                            <td>{field.comparedWith}</td>
                            <td>{pill(field.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {Number.isFinite(result.confidence) && (
                    <p className="aar-muted">
                      Document OCR confidence: {Math.round(result.confidence)}%.
                      Confidence is decision support, not proof of authenticity.
                    </p>
                  )}
                </div>
              );
            })}
            <div className="aar-match">
              <strong>Information Match</strong>
              {pill(
                currentVerificationState?.matchConfirmed
                  ? "Matched"
                  : "Needs review",
              )}
            </div>
            {!final && (
              <details className="aar-manual-checklist">
                <summary>Manual document review</summary>
                <p>
                  Open the original COR and grade evidence below, then mark each
                  as reviewed. OCR is optional for manual approval.
                </p>
                {docs
                  .filter(([kind]) =>
                    DOCUMENTS.some((item) => item.id === kind && item.required),
                  )
                  .map(([kind, doc]) => (
                    <label
                      key={kind}
                      className="mt-2 flex items-start gap-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        disabled={
                          busy ||
                          (!openedPaths.includes(doc.storagePath) &&
                            !manual.reviewedPaths?.includes(doc.storagePath))
                        }
                        checked={
                          !!manual.reviewedPaths?.includes(doc.storagePath)
                        }
                        onChange={(e) =>
                          updateManual(
                            "reviewedPaths",
                            e.target.checked
                              ? [
                                  ...new Set([
                                    ...(manual.reviewedPaths || []),
                                    doc.storagePath,
                                  ]),
                                ]
                              : (manual.reviewedPaths || []).filter(
                                  (path) => path !== doc.storagePath,
                                ),
                          )
                        }
                      />
                      I reviewed the original {documentLabel(kind)} document.
                    </label>
                  ))}
                {[
                  [
                    "identityConfirmed",
                    "Applicant identity and student information match the documents.",
                  ],
                  [
                    "currentEnrollment",
                    "COR confirms enrollment for the current semester.",
                  ],
                  [
                    "gradesRelevant",
                    "Grade evidence supports the listed subject expertise.",
                  ],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={!!manual[key]}
                      disabled={busy}
                      onChange={(e) => updateManual(key, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
                <p>
                  Add at least 15 characters of LCO Notes explaining your
                  review. Complete both required document reviews before
                  approval.
                </p>
              </details>
            )}
            <label htmlFor="application-lco-notes">
              <strong>LCO Notes</strong>
            </label>
            <textarea
              id="application-lco-notes"
              className={input}
              placeholder="Internal notes for this review."
              rows={4}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={final}
            />
            {!final && (
              <button className={button} disabled={busy} onClick={() => save()}>
                <Save size={14} />
                Save note
              </button>
            )}
            {!!r.history?.length && (
              <details>
                <summary>Review history ({r.history.length})</summary>
                {r.history.map((item, i) => (
                  <p key={i}>
                    {item.to}: {item.reason}
                  </p>
                ))}
              </details>
            )}
          </section>
        </div>
        {message && (
          <p
            role={
              message.includes("Could not") || message.includes("Enter ")
                ? "alert"
                : "status"
            }
          >
            {message}
          </p>
        )}
      </div>
      <footer>
        {final ? (
          <p>Final decision: {r.status}</p>
        ) : (
          <>
            <button
              className={`${button} text-red-600`}
              disabled={busy}
              onClick={() => setDecision("Rejected")}
            >
              <X size={14} />
              Reject Application
            </button>
            <div>
              <button
                className={button}
                disabled={busy}
                onClick={() => setDecision("Resubmission Required")}
              >
                <RotateCcw size={14} />
                Request Resubmission
              </button>
              <button
                className={primary}
                disabled={busy || !!ocrBusy || !canApprove}
                onClick={() => setDecision("Approved")}
              >
                <Check size={14} />
                Approve Tutor
              </button>
            </div>
            {!canApprove && (
              <p className="aar-review-gate" role="status">
                Complete manual review of both required documents (or OCR checks
                and Information Match) and add at least 15 characters of LCO
                Notes to enable approval.
              </p>
            )}
          </>
        )}
      </footer>
      {decision && (
        <ApplicationDecision
          key={decision}
          record={{ ...r, notes: notes.trim() }}
          decision={decision}
          verificationState={currentVerificationState}
          onSave={(next) => saveTutorDecision(next)}
          onClose={() => setDecision("")}
        />
      )}
      {viewingDocument && (
        <dialog
          ref={viewerRef}
          className="aar-document-viewer"
          aria-labelledby="aar-document-viewer-title"
          onCancel={() => setViewingDocument(null)}
          onClick={(event) => {
            if (event.target === viewerRef.current) setViewingDocument(null);
          }}
        >
          <header>
            <div>
              <h2 id="aar-document-viewer-title">{viewingDocument.doc.name}</h2>
              <p>{viewingDocument.kind} · Document preview</p>
            </div>
            <button
              className={button}
              aria-label="Close document preview"
              onClick={() => setViewingDocument(null)}
            >
              <X size={16} />
            </button>
          </header>
          <div className="aar-document-viewer-body">
            {documentPreview.loading ? (
              <p role="status">Loading document preview…</p>
            ) : documentPreview.error ? (
              <p role="alert" className="text-red-700">
                {documentPreview.error}
              </p>
            ) : viewingDocument.doc.type === "application/pdf" ? (
              <iframe
                className="aar-document-preview aar-pdf-preview"
                src={documentPreview.url}
                title={`Preview ${viewingDocument.doc.name}`}
              />
            ) : (
              <img
                className="aar-document-preview aar-image-preview"
                src={documentPreview.url}
                alt={`Preview of ${viewingDocument.doc.name}`}
              />
            )}
          </div>
          <footer>
            <button
              className={button}
              disabled={!documentPreview.url}
              onClick={downloadPreview}
            >
              <Download size={14} />
              Download document
            </button>
          </footer>
        </dialog>
      )}
    </dialog>
  );
}
