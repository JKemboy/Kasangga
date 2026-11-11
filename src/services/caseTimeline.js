const kind = (event) =>
  String(event.action || event.status || "").toLowerCase();

export function caseTimeline(history = []) {
  const groups = new Map();
  for (const event of history) {
    const type = kind(event);
    let key;
    if (type === "decision") {
      key = `decision:${event.at}:${event.officer || event.by || ""}`;
    } else if (
      type === "condition" &&
      (event.index != null || event.after?.text)
    ) {
      key = `condition:${event.index ?? event.after.text}`;
    } else {
      key = Symbol();
    }
    const group = groups.get(key) || [];
    group.push(event);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((updates) => {
      const sorted = [...updates].sort(
        (a, b) => new Date(a.at) - new Date(b.at),
      );
      const latest = sorted.at(-1);
      const type = kind(latest);
      const condition = latest.after;
      const notes = [
        ...new Set(sorted.map((event) => event.notes).filter(Boolean)),
      ];
      return {
        ...latest,
        title:
          type === "decision"
            ? "Decision recorded"
            : type === "condition" && condition
              ? `Condition ${latest.index != null ? Number(latest.index) + 1 : "update"}: ${condition.completed ? "Completed" : "Pending"}`
              : latest.actionLabel ||
                latest.action ||
                latest.status ||
                "Case action recorded",
        notes:
          type === "condition"
            ? [condition?.text, latest.notes].filter(Boolean).join(" — ")
            : notes.join("\n"),
        updates: type === "condition" ? sorted.slice(0, -1) : [],
      };
    })
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}
