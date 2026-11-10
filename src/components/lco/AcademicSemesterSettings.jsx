import { useEffect, useState } from "react";
import { button, primary, input } from "../shared/staffUi.jsx";
import {
  listAcademicSemesters,
  saveAcademicSemester,
} from "../../services/incidentAdministration.js";
const empty = { id: null, year: "", semester: "", start: "", end: "" };
export default function AcademicSemesterSettings() {
  const [rows, setRows] = useState([]),
    [draft, setDraft] = useState(empty),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = () =>
    listAcademicSemesters()
      .then(setRows)
      .catch((cause) => setError(cause.message));
  useEffect(() => {
    refresh();
  }, []);
  const change = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveAcademicSemester(draft);
      await refresh();
      setDraft(empty);
      setNotice("Official semester saved.");
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ad-panel">
      <h2>Academic Year and Semester Configuration</h2>
      <p className="mt-1 text-xs text-slate-500">
        Use official dates. Repeated-incident counting is inactive for sessions
        outside configured semesters. Dates cannot overlap.
      </p>
      {rows.map((row) => (
        <div
          key={row.semester_id}
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-xs"
        >
          <span>
            <b>
              AY. {row.academic_year}, {row.semester}
            </b>
            <br />
            {row.start_date} — {row.end_date}
          </span>
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() =>
              setDraft({
                id: row.semester_id,
                year: row.academic_year,
                semester: row.semester,
                start: row.start_date,
                end: row.end_date,
              })
            }
          >
            Edit
          </button>
        </div>
      ))}
      <fieldset disabled={busy} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs">
          Academic Year
          <input
            className={input + " mt-1"}
            value={draft.year}
            placeholder="e.g. 2026–2027"
            onChange={(e) => change("year", e.target.value)}
          />
        </label>
        <label className="text-xs">
          Semester
          <select
            className={input + " mt-1"}
            value={draft.semester}
            onChange={(e) => change("semester", e.target.value)}
          >
            <option value="">Select semester</option>
            <option>1st Semester</option>
            <option>2nd Semester</option>
          </select>
        </label>
        <label className="text-xs">
          Semester Start Date
          <input
            type="date"
            className={input + " mt-1"}
            value={draft.start}
            onChange={(e) => change("start", e.target.value)}
          />
        </label>
        <label className="text-xs">
          Semester End Date
          <input
            type="date"
            className={input + " mt-1"}
            value={draft.end}
            min={draft.start || undefined}
            onChange={(e) => change("end", e.target.value)}
          />
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-2 text-xs text-green-700">
          {notice}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={primary}
          disabled={
            busy ||
            !draft.year ||
            !draft.semester ||
            !draft.start ||
            !draft.end ||
            draft.end < draft.start
          }
          onClick={save}
        >
          {busy ? "Saving…" : "Save Semester"}
        </button>
        {draft.id && (
          <button
            type="button"
            className={button}
            onClick={() => setDraft(empty)}
          >
            Cancel Edit
          </button>
        )}
      </div>
    </section>
  );
}
