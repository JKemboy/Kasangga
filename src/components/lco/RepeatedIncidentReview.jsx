import { useEffect, useState } from "react";
import {
  listAcademicSemesters,
  repeatedIncidentCandidates,
  referRepeatedIncidents,
} from "../../services/incidentAdministration.js";
import { useLcoDatabase } from "./LcoDatabaseContext.jsx";
import { incidentConfirmationLabel } from "../../services/incidentTypes.js";
import { button, primary, input, Modal } from "../shared/staffUi.jsx";
export default function RepeatedIncidentReview({ reports, onOpen }) {
  const database = useLcoDatabase();
  const [rows, setRows] = useState([]),
    [configured, setConfigured] = useState(false),
    [selected, setSelected] = useState(null),
    [notes, setNotes] = useState(""),
    [ack, setAck] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([listAcademicSemesters(), repeatedIncidentCandidates()])
      .then(([terms, candidates]) => {
        if (live) {
          setConfigured(terms.length > 0);
          setRows(candidates);
          setError("");
        }
      })
      .catch((cause) => {
        if (live) setError(cause.message);
      });
    return () => {
      live = false;
    };
  }, [reports]);
  async function refer(event) {
    event.preventDefault();
    if (busy || !ack || notes.trim().length < 15) return;
    setBusy(true);
    setError("");
    try {
      await referRepeatedIncidents(
        selected.student_id,
        selected.semester_id,
        notes.trim(),
      );
      await database.refresh();
      setSelected(null);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <h2 className="text-sm font-semibold">
        Repeated Rule Violations — LCO Review
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        {configured
          ? "Three distinct No-Show or Late Cancellation session incidents in an official semester flag a student for review. Reports are allegations, not confirmed violations."
          : "Counting is inactive: configure official semester dates under LCO Settings."}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
      {configured && !rows.length && (
        <p className="mt-2 text-xs">
          No students currently meet the three-incident threshold.
        </p>
      )}
      {rows.map((row) => (
        <div
          key={`${row.student_id}:${row.semester_id}`}
          className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-xs"
        >
          <span>
            <b>{row.student_name}</b> · {row.incident_count} distinct sessions
            <br />
            AY. {row.academic_year}, {row.semester}
          </span>
          {row.referral_report_id ? (
            <span className="text-green-800">
              Referred as IR-{row.referral_report_id} ·{" "}
              {incidentConfirmationLabel(
                reports.find(
                  (report) =>
                    String(report.id) === String(row.referral_report_id),
                )?.confirmationStatus,
              )}
            </span>
          ) : (
            <button
              type="button"
              className={button}
              onClick={() => {
                setSelected(row);
                setNotes("");
                setAck(false);
                setError("");
              }}
            >
              Review for Referral
            </button>
          )}
        </div>
      ))}
      {selected && (
        <Modal
          title="Review Repeated Rule Violations"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <form onSubmit={refer} className="space-y-3 text-xs">
            <p>
              {selected.student_name} · AY. {selected.academic_year},{" "}
              {selected.semester}. Student Handbook p. 78. Review the records
              before deciding whether to refer.
            </p>
            <div className="flex flex-wrap gap-2">
              {selected.source_reports.map((id) => (
                <button
                  type="button"
                  className={button}
                  key={id}
                  onClick={() => {
                    const row = reports.find(
                      (report) => String(report.id) === String(id),
                    );
                    if (row) onOpen(row);
                  }}
                >
                  View IR-{id}
                </button>
              ))}
            </div>
            <label className="block">
              LCO referral notes
              <textarea
                className={input + " mt-1"}
                required
                minLength={15}
                maxLength={2000}
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={ack}
                required
                onChange={(event) => setAck(event.target.checked)}
              />
              I reviewed the distinct session records and recommend referral.
              OSWE must confirm any violation.
            </label>
            {error && (
              <p role="alert" className="text-red-600">
                {error}
              </p>
            )}
            <button
              className={primary}
              disabled={busy || !ack || notes.trim().length < 15}
            >
              {busy ? "Referring…" : "Refer to OSWE"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
