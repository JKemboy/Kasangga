export function moderateService(
  service,
  action,
  reason = "",
  fields = [],
  acknowledged = false,
) {
  if (
    !["Request Changes", "Suspend Service", "Lift Suspension"].includes(action)
  )
    throw new Error("Invalid service action.");
  if (action === "Suspend Service" && service.status !== "Active")
    throw new Error("Only active services can be suspended.");
  if (action === "Lift Suspension" && service.status !== "Suspended")
    throw new Error("This service is not suspended.");
  if (action !== "Lift Suspension" && reason.trim().length < 15)
    throw new Error("Enter at least 15 characters.");
  if (action === "Request Changes" && !fields.length)
    throw new Error("Select what needs to change.");
  if (action === "Suspend Service" && !acknowledged)
    throw new Error("Acknowledge the effect on bookings.");
  const status =
    action === "Suspend Service"
      ? "Suspended"
      : action === "Lift Suspension"
        ? "Active"
        : service.status;
  return {
    ...service,
    status,
    history: [
      ...(service.history || []),
      {
        from: service.status,
        to: action === "Request Changes" ? action : status,
        reason:
          action === "Lift Suspension"
            ? "Service suspension lifted"
            : reason.trim(),
        fields: action === "Request Changes" ? [...fields] : [],
        at: new Date().toISOString(),
        by: "Admin User",
      },
    ],
  };
}
export function serviceCsv(rows) {
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return [
    [
      "Service ID",
      "Tutor",
      "Service title / Subject",
      "Topics",
      "Topic hourly rates",
      "Session Type",
      "Created Date",
      "Status",
    ],
    ...rows.map((r) => [
      r.id,
      r.tutor,
      r.title,
      r.topics.join("; "),
      r.topicDetails.map((t) => `${t.name}: ${t.rate}`).join("; "),
      r.type,
      r.date,
      r.status,
    ]),
  ]
    .map((r) => r.map(cell).join(","))
    .join("\r\n");
}
