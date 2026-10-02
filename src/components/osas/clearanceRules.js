export function clearanceOptions(record, cases) {
  const relevant = cases.filter((c) => c.student === record.name);
  const hold =
    record.status === "On Hold" ||
    relevant.some((c) => c.decision?.outcome === "Clearance Hold Recommended");
  const condition = relevant.some(
    (c) => c.decision?.condition && !c.decision.conditionDone,
  );
  return {
    Cleared: !hold && !condition,
    "On Hold":
      record.status !== "On Hold" &&
      relevant.some(
        (c) => c.decision?.outcome === "Clearance Hold Recommended",
      ),
    "Requires Resolution": condition,
    Maintain: true,
  };
}
export function decideClearance(record, choice, note, cases) {
  if (record.status === "Cleared") throw Error("This review is complete.");
  if (!clearanceOptions(record, cases)[choice])
    throw Error("This decision is not supported by the recorded case or hold.");
  if (note.trim().length < 15) throw Error("Enter at least 15 characters.");
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
        basis: note.trim(),
        notes: note.trim(),
        reviewed,
        officer: "Maria Santos",
      },
    ],
  };
}
