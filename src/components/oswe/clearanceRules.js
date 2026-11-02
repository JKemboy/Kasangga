export function clearanceOptions(record, cases) {
  const relevant = cases.filter((c) => c.studentUserId === record.userId);
  const hold =
    (record.holds || []).some((h) => h.hold_status === "active") ||
    relevant.some(
      (c) =>
        c.decision?.outcome === "Clearance Hold Recommended" &&
        !(record.holds || []).some(
          (h) => h.case_id === c.caseDatabaseId && h.hold_status === "released",
        ),
    );
  const unresolvedCase = relevant.some((c) => c.status !== "Resolved");
  return {
    // An unresolved case does not pre-decide student clearance. Only an
    // active, recorded hold prevents the officer from choosing Cleared.
    Cleared: !(record.holds || []).some((h) => h.hold_status === "active"),
    "On Hold":
      record.status !== "On Hold" &&
      relevant.some(
        (c) => c.decision?.outcome === "Clearance Hold Recommended",
      ),
    "Requires Resolution":
      unresolvedCase,
    Maintain: true,
  };
}
export function decideClearance(record, choice, note, cases) {
  if (record.status === "Cleared") throw Error("This review is complete.");
  if (!clearanceOptions(record, cases)[choice])
    throw Error("This decision is not supported by the recorded case or hold.");
  const decisionNote = note?.trim() || "";
  const reviewed = new Date().toISOString().slice(0, 10),
    status = choice === "Maintain" ? record.status : choice;
  return {
    ...record,
    status,
    reviewed,
    history: [
      ...(record.history || []),
      {
        status,
        basis: decisionNote,
        notes: decisionNote,
        reviewed,
        officer: "OSWE Officer",
      },
    ],
  };
}
