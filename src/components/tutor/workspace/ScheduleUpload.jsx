import { useEffect, useRef, useState } from "react";
import { Upload, ShieldCheck, Plus, Trash2 } from "lucide-react";
import { Modal, button, primary, input } from "./ui.jsx";
import {
  scheduleFileError,
  scheduleFileStore,
  saveScheduleDraft,
} from "./scheduleUploads.js";
import { extractSchedule } from "./scheduleOcr.js";
import {
  DAYS,
  confirmedClasses,
  rowErrors,
  rowsToClasses,
  scheduleImpact,
  confirmSchedule,
} from "./scheduleReview.js";
import { time } from "./data.js";
import "./schedule-review.css";
const blank = () => ({
  id: crypto.randomUUID(),
  code: "",
  name: "",
  day: "",
  start: "",
  end: "",
  room: "",
  uncertain: [],
});
export default function ScheduleUpload({
  data,
  update,
  onClose,
  visible = true,
  onReviewAvailability,
}) {
  const [file, setFile] = useState(null),
    [draft, setDraft] = useState(data.scheduleReview || null),
    [stage, setStage] = useState(data.scheduleReview ? "review" : "upload"),
    [error, setError] = useState(""),
    [progress, setProgress] = useState({ label: "Preparing OCR", progress: 0 }),
    [checked, setChecked] = useState(false),
    [confirming, setConfirming] = useState(false),
    [preview, setPreview] = useState("");
  const controller = useRef(null),
    latest = useRef({ data, update });
  latest.current = { data, update };
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const rows = draft?.rows || [],
    errors = rowErrors(rows),
    invalid = errors.filter((e) => Object.keys(e).length).length,
    low = rows.reduce((n, r) => n + (r.uncertain?.length || 0), 0);
  const impact = scheduleImpact(
    data,
    rowsToClasses(rows.filter((r, i) => !Object.keys(errors[i]).length)),
  );
  const current = confirmedClasses(data);
  const proposed = rowsToClasses(
    rows.filter((r, i) => !Object.keys(errors[i]).length),
  );
  const signature = (c) => JSON.stringify(c);
  const removed = current.filter(
    (c) => !proposed.some((v) => signature(c) === signature(v)),
  );
  const added = proposed.filter(
    (c) => !current.some((v) => signature(c) === signature(v)),
  );
  function persist(value) {
    const saved = latest.current.update((d) => ({
      ...d,
      scheduleReview: value,
    }));
    if (saved === false)
      throw new Error("Could not save the review on this browser.");
  }
  function saveLater() {
    try {
      persist(draft);
      onClose();
    } catch (e) {
      setError(e.message);
    }
  }
  function close() {
    if (stage === "review") saveLater();
    else {
      if (stage === "done") {
        setDraft(null);
        setStage("upload");
        setFile(null);
        setPreview("");
      }
      onClose();
    }
  }
  async function process(selected = file) {
    const validation = scheduleFileError(selected);
    if (validation) return setError(validation);
    setError("");
    setStage("processing");
    setChecked(false);
    controller.current = new AbortController();
    setProgress({ label: "Saving file", progress: 0 });
    try {
      const metadata = await saveScheduleDraft(
        selected,
        (fn) => latest.current.update(fn),
        { isCancelled: () => controller.current.signal.aborted },
      );
      if (!metadata) return;
      const result = await extractSchedule(
        selected,
        setProgress,
        controller.current.signal,
      );
      const next = { ...metadata, ...result };
      persist(next);
      setDraft(next);
      setStage("review");
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.message || "OCR failed. Please try a clearer file.");
        setStage("upload");
      }
    }
  }
  function patch(id, key, value) {
    setDraft({
      ...draft,
      rows: rows.map((r) =>
        r.id === id
          ? {
              ...r,
              [key]: value,
              uncertain: (r.uncertain || []).filter((k) => k !== key),
            }
          : r,
      ),
    });
    setChecked(false);
  }
  async function openSource() {
    try {
      const saved = file || (await scheduleFileStore.load(draft.id));
      if (!saved)
        throw new Error(
          "Original file is unavailable. Please choose it again.",
        );
      setFile(saved);
    } catch (e) {
      setError(e.message);
    }
  }
  async function loadPrevious(upload) {
    try {
      const saved = await scheduleFileStore.load(upload.id);
      if (!saved)
        throw new Error("File unavailable on this browser. Choose it again.");
      setFile(saved);
      process(saved);
    } catch (e) {
      setError(e.message);
    }
  }
  function finish() {
    try {
      const next = confirmSchedule(latest.current.data, draft, checked);
      if (latest.current.update(() => next) === false)
        throw new Error("Could not save the confirmed schedule.");
      setConfirming(false);
      setStage("done");
    } catch (e) {
      setError(e.message);
      setConfirming(false);
    }
  }
  if (!visible) return null;
  const step =
    stage === "upload"
      ? 0
      : stage === "processing"
        ? 1
        : stage === "review"
          ? 2
          : 3;
  return (
    <>
      <Modal
        size={stage === "review" ? "schedule-review" : "large"}
        title={
          stage === "review"
            ? "Review Updated Schedule"
            : "Upload Updated Class Schedule"
        }
        subtitle={
          draft?.name ||
          "Upload your official class schedule or Certificate of Registration"
        }
        onClose={close}
        footer={
          stage === "upload" ? (
            <>
              <button className={button} onClick={onClose}>
                Cancel
              </button>
              <button
                className={primary}
                disabled={!file || !!scheduleFileError(file)}
                onClick={() => process()}
              >
                Process with OCR
              </button>
            </>
          ) : stage === "processing" ? (
            <button className={button} onClick={onClose}>
              Run in background
            </button>
          ) : stage === "review" ? (
            <>
              <button className={button} onClick={saveLater}>
                Save for later
              </button>
              <button
                className={primary}
                disabled={!rows.length || !!invalid || !checked}
                onClick={() => setConfirming(true)}
              >
                Confirm Class Schedule
              </button>
            </>
          ) : (
            <>
              <button className={button} onClick={close}>
                View Class Schedule
              </button>
              <button
                className={primary}
                onClick={() => {
                  setDraft(null);
                  setStage("upload");
                  setFile(null);
                  setPreview("");
                  onReviewAvailability();
                }}
              >
                Review Availability
              </button>
            </>
          )
        }
      >
        <ol className="ocr-steps">
          {[
            "Upload",
            "OCR Processing",
            "Review Extracted Schedule",
            "Confirm",
          ].map((label, i) => (
            <li
              key={label}
              className={i === step ? "current" : i < step ? "complete" : ""}
            >
              {i < step ? "✓" : `${i + 1}.`} {label}
            </li>
          ))}
        </ol>
        {stage === "upload" && (
          <div className="space-y-4">
            <p className="session-info">
              Your current confirmed schedule stays active while the new one is
              processed and reviewed. Nothing changes until you confirm.
            </p>
            <label className="ocr-upload">
              <Upload size={30} />
              <strong>Choose your class schedule file</strong>
              <span>
                Certificate of Registration or official schedule · PDF, JPG, or
                PNG up to 10 MB
              </span>
              <input
                aria-label="Class schedule file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const chosen = e.target.files[0];
                  setFile(chosen || null);
                  setError(chosen ? scheduleFileError(chosen) : "");
                }}
              />
              {file && <b>{file.name}</b>}
            </label>
            <p className="session-muted">
              Text is read on this device. The OCR engine downloads its language
              data the first time; an internet connection is needed.
            </p>
            {draft && (
              <button className={button} onClick={() => setStage("review")}>
                Continue saved review: {draft.name}
              </button>
            )}
            {data.uploads.length > 0 && (
              <details>
                <summary>Previous uploads</summary>
                {[...data.uploads].reverse().map((u, i) => (
                  <div
                    key={u.id || i}
                    className="flex justify-between gap-2 py-2"
                  >
                    <span>{u.name}</span>
                    <button
                      className={button}
                      disabled={!u.id}
                      onClick={() => loadPrevious(u)}
                    >
                      Read with OCR
                    </button>
                  </div>
                ))}
              </details>
            )}
          </div>
        )}
        {stage === "processing" && (
          <div className="ocr-processing" aria-live="polite">
            <div className="ocr-spinner" />
            <h3>Processing {file?.name}</h3>
            <p>Your confirmed schedule stays active during this step.</p>
            <progress value={progress.progress} max={1} />
            <p>{progress.label}</p>
            <p className="session-muted">
              You may close this dialog while processing on this page. Leaving
              the page cancels processing; the uploaded file remains saved.
            </p>
          </div>
        )}
        {stage === "review" && (
          <div className="space-y-3">
            <div className="ocr-summary">
              <span>{rows.length} classes extracted</span>
              <span>{low} low-confidence fields to check</span>
              <span className={invalid ? "errors" : ""}>
                {invalid ? `${invalid} rows need fixing` : "No errors"}
              </span>
            </div>
            <p className="session-muted">
              Compare every row with your official file. Highlighted fields need
              checking. Edit a highlighted field to clear its flag.
            </p>
            <div className="flex gap-2">
              <button className={button} onClick={openSource}>
                Show original file
              </button>
              <button
                className={button}
                onClick={() => {
                  setStage("upload");
                  setChecked(false);
                }}
              >
                Choose another file
              </button>
            </div>
            {preview && (
              <details>
                <summary>Original file preview</summary>
                <a
                  className="text-green-800 underline"
                  href={preview}
                  download={file?.name || draft?.name}
                >
                  Download original file
                </a>
                {file?.type === "application/pdf" ? (
                  <iframe
                    title="Original class schedule"
                    src={preview}
                    className="ocr-preview"
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Original class schedule"
                    className="ocr-preview"
                  />
                )}
              </details>
            )}
            {!rows.length && (
              <p role="status" className="session-warning">
                No class rows could be reliably detected. Review the extracted
                text below, add rows manually, or upload a clearer schedule. No
                sample classes have been substituted.
              </p>
            )}
            <div className="ocr-table-wrap">
              <table className="ocr-table">
                <thead>
                  <tr>
                    {[
                      "Course Code",
                      "Course Name",
                      "Day",
                      "Start Time",
                      "End Time",
                      "Room",
                      "",
                    ].map((v, i) => (
                      <th key={i}>{v}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      {["code", "name", "day", "start", "end", "room"].map(
                        (key) => (
                          <td key={key}>
                            <div
                              className={
                                errors[i][key]
                                  ? "ocr-field-error"
                                  : r.uncertain?.includes(key)
                                    ? "ocr-field-uncertain"
                                    : ""
                              }
                            >
                              {key === "day" ? (
                                <select
                                  aria-label={`Day row ${i + 1}`}
                                  className={input}
                                  value={r.day}
                                  onChange={(e) =>
                                    patch(r.id, key, e.target.value)
                                  }
                                >
                                  <option value="">Day</option>
                                  {DAYS.map((d, index) => (
                                    <option key={d} value={index}>
                                      {d}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  aria-label={`${key} row ${i + 1}`}
                                  className={input}
                                  type={
                                    ["start", "end"].includes(key)
                                      ? "time"
                                      : "text"
                                  }
                                  value={r[key]}
                                  onChange={(e) =>
                                    patch(r.id, key, e.target.value)
                                  }
                                />
                              )}
                            </div>
                            {errors[i][key] && (
                              <small className="text-red-600">
                                {errors[i][key]}
                              </small>
                            )}
                          </td>
                        ),
                      )}
                      <td>
                        <button
                          aria-label={`Remove class row ${i + 1}`}
                          onClick={() => {
                            setDraft({
                              ...draft,
                              rows: rows.filter((v) => v.id !== r.id),
                            });
                            setChecked(false);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className={button}
              onClick={() => {
                setDraft({ ...draft, rows: [...rows, blank()] });
                setChecked(false);
              }}
            >
              <Plus size={14} className="inline" /> Add class row
            </button>
            <details>
              <summary>
                Extracted text and unrecognized lines (
                {draft.unparsed?.length || 0})
              </summary>
              <p className="session-muted">
                Check for classes the reader missed. Add missing rows before
                confirming.
              </p>
              <pre className="ocr-raw">{draft.text || "No text detected."}</pre>
            </details>
            <h3 className="font-semibold">
              Changes from your current schedule
            </h3>
            <ul className="list-disc pl-5">
              {added.map((c, i) => (
                <li key={"a" + i}>
                  {c[3]} added on {DAYS[c[0]]} {time(c[1])} – {time(c[2])}
                </li>
              ))}
              {removed.map((c, i) => (
                <li key={"r" + i}>
                  {c[3]} on {DAYS[c[0]]} {time(c[1])} – {time(c[2])} removed
                </li>
              ))}
            </ul>
            {!!impact.slots.length && (
              <p className="session-warning">
                {impact.slots.length} availability blocks overlap the new
                classes. These times will be blocked until you update or remove
                them.
              </p>
            )}
            {!!impact.sessions.length && (
              <p className="session-warning">
                {impact.sessions.length} booked sessions overlap the new
                classes. Existing bookings stay scheduled; use Request
                Reschedule in My Sessions.
              </p>
            )}
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              I checked every row and all extracted text against my official
              class schedule, including any missing classes. After confirmation
              this schedule becomes read-only.
            </label>
          </div>
        )}
        {stage === "done" && (
          <div className="space-y-4 py-5">
            <ShieldCheck className="mx-auto text-green-800" size={48} />
            <h3 className="text-center text-lg font-bold">
              Updated class schedule confirmed
            </h3>
            <p className="text-center">
              {rows.length} classes are now read-only and block tutoring time
              automatically.
            </p>
            {!!impact.slots.length && (
              <p className="session-warning">
                {impact.slots.length} availability blocks now overlap your
                classes. Review Availability to update or remove them.
              </p>
            )}
            {impact.sessions.map((s) => (
              <p className="session-warning" key={s.id}>
                {s.service} with {s.learner} on {s.date} overlaps class time.
                Use Request Reschedule from My Sessions.
              </p>
            ))}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-red-700">
            {error}
          </p>
        )}
      </Modal>
      {confirming && (
        <Modal
          size="small"
          title="Replace your confirmed class schedule?"
          onClose={() => setConfirming(false)}
          footer={
            <>
              <button className={button} onClick={() => setConfirming(false)}>
                Back to review
              </button>
              <button className={primary} onClick={finish}>
                Confirm Class Schedule
              </button>
            </>
          }
        >
          <p>
            {rows.length} classes will become read-only and block tutoring time,
            replacing your current schedule.
          </p>
          <p className="mt-3">
            {impact.slots.length} availability blocks will need updating.
            Existing bookings are not cancelled.
          </p>
        </Modal>
      )}
    </>
  );
}
