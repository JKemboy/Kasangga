import CaseReviewFlow from "./CaseReviewFlow.jsx";
import ArchivedCaseDetails from "./ArchivedCaseDetails.jsx";
import { useOsweDatabase } from "./OsweDatabaseContext.jsx";
import { academicYear } from "../../services/academicYear.js";
export default function CaseShortcut({ record, onClose }) {
  const database = useOsweDatabase();
  const current =
    (database.records?.cases || []).find((c) => c.caseId === record.caseId) ||
    record;
  if (!current.decision && !current.archived && current.status !== "Resolved")
    return <CaseReviewFlow record={current} onClose={onClose} />;
  const archived = (database.records?.archive || []).find(
    (c) => c.caseId === current.caseId,
  );
  const row = archived || {
    ...current,
    full: current,
    incident: current.id,
    opened: current.date,
    resolved: current.resolvedAt?.slice(0, 10),
    archived: current.archivedAt?.slice(0, 10),
    year: academicYear(
      current.archivedAt || current.resolvedAt || current.date,
    ),
    outcome: current.decision?.outcome || current.resolution || "Resolved",
    evidence: (database.records?.evidence || [])
      .filter((e) => e.reportDatabaseId === current.reportDatabaseId)
      .map((e) => ({ ...e, filename: e.fileName })),
  };
  const date = (value) =>
    value
      ? new Date(
          String(value).slice(0, 10) + "T12:00:00+08:00",
        ).toLocaleDateString("en-PH", {
          timeZone: "Asia/Manila",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Not recorded";
  return <ArchivedCaseDetails record={row} date={date} onClose={onClose} />;
}
