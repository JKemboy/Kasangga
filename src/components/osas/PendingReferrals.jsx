import { useState } from "react";
import { useOsasDatabase } from "./OsasDatabaseContext.jsx";
import IncidentAssessment from "./IncidentAssessment.jsx";
import { button } from "../tutor/workspace/ui.jsx";
export default function PendingReferrals({ month = "" }) {
  const database = useOsasDatabase();
  const [selected, setSelected] = useState(null);
  const rows = (database.records?.incidents || []).filter(
    (r) =>
      r.status === "Awaiting OSAS Assessment" &&
      !r.caseId &&
      (!month || r.date.startsWith(month)),
  );
  if (!rows.length) return null;
  return (
    <section
      className="rounded-lg border border-blue-200 bg-blue-50 p-4 my-3"
      aria-label="Referrals awaiting OSAS assessment"
    >
      <h2 className="font-semibold">
        Awaiting OSAS Assessment ({rows.length})
      </h2>
      <p className="text-sm">
        These reports have been referred by Admin. Review each report and open a
        formal case when appropriate. Case totals update after a case is opened.
      </p>
      {rows.map((r) => (
        <div
          key={r.id}
          className="flex flex-wrap items-center justify-between gap-3 border-t py-3 mt-2"
        >
          <div>
            <strong>
              {r.id} ? {r.type}
            </strong>
            <p className="text-sm">
              Reported student: {r.student} ? Submitted: {r.date}
            </p>
          </div>
          <button className={button} onClick={() => setSelected(r)}>
            Review referral {r.id}
          </button>
        </div>
      ))}
      {selected && (
        <IncidentAssessment
          record={
            (database.records?.incidents || []).find(
              (r) => r.id === selected.id,
            ) || selected
          }
          onClose={() => setSelected(null)}
          onSave={async (updated) => {
            await database.save(
              "incident",
              updated.reportDatabaseId,
              updated.assessment.action,
              updated,
            );
            setSelected(null);
            return true;
          }}
        />
      )}
    </section>
  );
}
