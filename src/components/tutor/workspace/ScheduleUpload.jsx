import { useEffect, useRef, useState } from "react";
import { Upload, ShieldCheck, Plus, Trash2 } from "lucide-react";
import { Modal, button, primary, input } from "./ui.jsx";
import {
  scheduleFileError,
  extractScheduleText,
} from "../../../services/ocrService.js";
import {
  requireScheduleUser,
  uploadScheduleImage,
  downloadScheduleImage,
} from "../../../services/scheduleStorage.js";
import {
  DAYS,
  confirmedClasses,
  rowErrors,
  rowsToClasses,
  scheduleImpact,
  confirmSchedule,
} from "./scheduleReview.js";
import { parseScheduleRows } from "../../../services/scheduleOcr.js";
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
  saveClassSchedule,
  onClose,
  visible = true,
  onReviewAvailability,
}) {
  const [file, setFile] = useState(null),
    [draft, setDraft] = useState(data.scheduleReview || null),
    [stage, setStage] = useState(data.scheduleReview ? "review" : "upload"),
    [error, setError] = useState(""),
    [progress, setProgress] = useState({
      label: "Preparing upload",
      progress: 0,
    }),
    [checked, setChecked] = useState(false),
    [confirming, setConfirming] = useState(false),
    [saving, setSaving] = useState(false),
    [preview, setPreview] = useState("");
  const extracted = useRef(null),
    busy = useRef(false),
    controller = useRef(null),
    latest = useRef({ data, saveClassSchedule });
  latest.current = { data, saveClassSchedule };
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const rows = draft?.rows || [],
    errors = rowErrors(rows),
    invalid = errors.filter((e) => Object.keys(e).length).length;
  const uploads = data.classSchedule?.source
    ? [
        {
          id: data.classSchedule.id,
          storagePath: data.classSchedule.source,
          name: data.classSchedule.source.split("/").at(-1),
        },
      ]
    : [];
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
  function close() {
    if (stage === "review") {
      setError(
        "Confirm the reviewed classes to save them, or discard this review.",
      );
      return;
    }
    if (stage === "done") {
      setDraft(null);
      setStage("upload");
      setFile(null);
      setPreview("");
      onClose();
    }
    onClose();
  }
  function selectFile(event) {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    const validation = scheduleFileError(chosen);
    setError(validation);
    if (validation) {
      event.target.value = "";
      return;
    }
    extracted.current = null;
    setFile(chosen);
  }
  async function process(selected = file) {
    if (busy.current) return;
    const validation = scheduleFileError(selected);
    if (validation) return setError(validation);
    busy.current = true;
    const abort = new AbortController();
    controller.current = abort;
    setError("");
    setStage("processing");
    setChecked(false);
    try {
      setProgress({ label: "Checking your Supabase session", progress: 0 });
      const user = await requireScheduleUser();
      abort.signal.throwIfAborted();
      if (
        extracted.current?.file !== selected ||
        extracted.current.userId !== user.id
      ) {
        let confidence = null;
        const text = await extractScheduleText(selected, {
          onProgress: setProgress,
          onConfidence: (value) => {
            confidence = value;
          },
          signal: abort.signal,
        });
        extracted.current = {
          file: selected,
          userId: user.id,
          text,
          confidence,
        };
      }
      abort.signal.throwIfAborted();
      const result = extracted.current;
      setProgress({
        label: "Uploading original file to private storage",
        progress: 1,
      });
      // Keep upload metadata in the current form for retries.
      result.metadata ||= await uploadScheduleImage(selected, user.id);
      abort.signal.throwIfAborted();
      const next = {
        ...result.metadata,
        confidence: result.confidence,
        rows: parseScheduleRows(result.text),
      };
      setDraft(next);
      setStage("review");
    } catch (e) {
      if (!abort.signal.aborted) {
        setError(
          e.message ||
            "Could not process the schedule. Try a clearer PDF or image, or check your connection.",
        );
        setStage("upload");
      }
    } finally {
      busy.current = false;
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
      const saved =
        file || (draft.storagePath ? await downloadScheduleImage(draft) : null);
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
      const saved = upload.storagePath
        ? await downloadScheduleImage(upload)
        : null;
      if (!saved)
        throw new Error("Original file unavailable. Choose it again.");
      setFile(saved);
      process(saved);
    } catch (e) {
      setError(e.message);
    }
  }
  async function finish() {
    if (saving) return;
    setSaving(true);
    try {
      confirmSchedule(latest.current.data, draft, checked);
      await latest.current.saveClassSchedule(draft);
      setConfirming(false);
      setStage("done");
    } catch (e) {
      setError(e.message);
      setConfirming(false);
    } finally {
      setSaving(false);
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
                Read schedule and upload
              </button>
            </>
          ) : stage === "processing" ? (
            <button className={button} onClick={onClose}>
              Run in background
            </button>
          ) : stage === "review" ? (
            <>
              <button
                className={button}
                onClick={() => {
                  setDraft(null);
                  setStage("upload");
                  setFile(null);
                  setPreview("");
                  onClose();
                }}
              >
                Discard review
              </button>
              <button
                className={primary}
                disabled={!rows.length || !!invalid || !checked || saving}
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
        <ol className="schedule-steps">
          {[
            "Upload",
            "Read and upload",
            "Enter and review classes",
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
            <section className={file ? "schedule-selected-file" : ""}>
              {file && (
                <div className="schedule-file-heading">
                  <strong title={file.name}>{file.name}</strong>
                  <label className={button}>
                    Change file
                    <input
                      aria-label="Change class schedule file"
                      type="file"
                      className="sr-only"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={selectFile}
                    />
                  </label>
                </div>
              )}
              {!file ? (
                <label className="schedule-upload">
                  <Upload size={30} />
                  <strong>Choose your class schedule file</strong>
                  <span>
                    PDF, JPG, PNG, or WebP up to 10 MB. PDFs: up to 10 pages.
                  </span>
                  <input
                    aria-label="Class schedule file"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={selectFile}
                  />
                </label>
              ) : preview ? (
                file.type === "application/pdf" ? (
                  <iframe
                    src={preview}
                    title="Selected schedule PDF"
                    className="schedule-selected-preview"
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Selected schedule image"
                    className="schedule-selected-preview"
                  />
                )
              ) : (
                <p role="status">Preparing preview...</p>
              )}
            </section>
            <p className="session-muted">
              OCR runs in this browser. Review the recognized classes before
              confirming.
            </p>
            {draft && (
              <button className={button} onClick={() => setStage("review")}>
                Continue saved review: {draft.name}
              </button>
            )}
            {uploads.length > 0 && (
              <details>
                <summary>Saved schedule from database</summary>
                {uploads.map((u, i) => (
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
                      Enter classes
                    </button>
                  </div>
                ))}
              </details>
            )}
          </div>
        )}
        {stage === "processing" && (
          <div className="schedule-processing" aria-live="polite">
            <div className="schedule-spinner" />
            <h3>Processing {file?.name}</h3>
            <p>Your confirmed schedule stays active during this step.</p>
            <progress value={progress.progress} max={1} />
            <p>{progress.label}</p>
            <p className="session-muted">
              You may close this dialog while processing on this page. Leaving
              the page stops OCR. Any upload already completed remains in
              private storage.
            </p>
          </div>
        )}
        {stage === "review" && (
          <div className="space-y-3">
            <section aria-label="OCR result">
              <p className="session-muted">
                {draft.storagePath
                  ? "Original file saved in private schedule storage."
                  : "Upload the original file before confirming."}{" "}
                Confirmed class rows are saved to your database. Check and edit
                the recognized course number, descriptive title, time, days, and
                room before confirming.
              </p>
            </section>
            <div className="schedule-summary">
              <span>{rows.length} classes entered</span>
              <span className={invalid ? "errors" : ""}>
                {invalid ? `${invalid} rows need fixing` : "No errors"}
              </span>
            </div>
            <p className="session-muted">
              M = Monday · T = Tuesday · W = Wednesday · Th = Thursday · F =
              Friday. MTh means Monday and Thursday; TF means Tuesday and
              Friday. Each meeting day has its own row. Repeated identical
              meetings are removed.
            </p>
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
                    className="schedule-preview"
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Original class schedule"
                    className="schedule-preview"
                  />
                )}
              </details>
            )}
            {!rows.length && (
              <p role="status" className="session-warning">
                Add the classes from your official schedule using Add class row.
              </p>
            )}
            <div className="schedule-table-wrap">
              <table className="schedule-table">
                <thead>
                  <tr>
                    {[
                      "Course No / Subject",
                      "Descriptive Title",
                      "Days",
                      "Time",
                      "Room",
                      "",
                    ].map((v) => (
                      <th key={v}>{v}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      {["code", "name", "day", "time", "room"].map((key) => (
                        <td key={key}>
                          <div
                            className={
                              errors[i][key === "time" ? "start" : key] ||
                              (key === "time" && errors[i].end)
                                ? "schedule-field-error"
                                : r.uncertain?.includes(key)
                                  ? "schedule-field-uncertain"
                                  : ""
                            }
                          >
                            {key === "day" ? (
                              <select
                                aria-label={`Days row ${i + 1}`}
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
                            ) : key === "time" ? (
                              <div className="flex min-w-52 items-center gap-1">
                                <input
                                  aria-label={`Start time row ${i + 1}`}
                                  className={input}
                                  type="time"
                                  value={r.start}
                                  onChange={(e) =>
                                    patch(r.id, "start", e.target.value)
                                  }
                                />
                                <span>–</span>
                                <input
                                  aria-label={`End time row ${i + 1}`}
                                  className={input}
                                  type="time"
                                  value={r.end}
                                  onChange={(e) =>
                                    patch(r.id, "end", e.target.value)
                                  }
                                />
                              </div>
                            ) : (
                              <input
                                aria-label={`${key} row ${i + 1}`}
                                className={input}
                                type="text"
                                value={r[key]}
                                onChange={(e) =>
                                  patch(r.id, key, e.target.value)
                                }
                              />
                            )}
                          </div>
                          {key === "time" ? (
                            <>
                              {errors[i].start && (
                                <small className="text-red-600">
                                  {errors[i].start}
                                </small>
                              )}
                              {errors[i].end && (
                                <small className="text-red-600">
                                  {errors[i].end}
                                </small>
                              )}
                            </>
                          ) : (
                            errors[i][key] && (
                              <small className="text-red-600">
                                {errors[i][key]}
                              </small>
                            )
                          )}
                        </td>
                      ))}
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
              I checked every row against my official class schedule, including
              any missing classes. After confirmation this schedule becomes
              read-only.
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
              <button className={primary} disabled={saving} onClick={finish}>
                {saving ? "Saving..." : "Confirm Class Schedule"}
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
