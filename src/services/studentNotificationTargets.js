export function storedNotificationTarget(
  row,
  role,
  { sessions = [], received = [] } = {},
) {
  const entity = row.related_entity_type;
  const id = String(row.related_entity_id || "");
  if (entity === "tutor_applications")
    return { view: role === "learner" ? "application" : "dashboard", args: {} };
  if (entity === "incident_reports")
    return {
      view: "reports",
      args: {
        reportId: id,
        ...(received.some((r) => String(r.report_id) === id)
          ? { tab: "received" }
          : {}),
      },
    };
  if (entity === "cases") return { view: "reports", args: { caseId: id } };
  if (["clearance_reviews", "clearance_holds"].includes(entity))
    return { view: "reports", args: { tab: "received" } };
  if (entity === "services")
    return {
      view: role === "tutor" ? "services" : "find-tutor",
      args: { serviceId: id },
    };
  if (entity === "bookings")
    return { view: "sessions", args: { sessionId: id } };
  if (["payments", "refunds"].includes(entity)) {
    const session = sessions.find((s) =>
      [s.paymentId, s.refundId, s.transaction, s.transactionId].some(
        (value) => value != null && String(value) === id,
      ),
    );
    return role === "tutor"
      ? {
          view: "earnings",
          args: session?.transaction
            ? { transactionId: session.transaction }
            : {},
        }
      : { view: "sessions", args: session ? { sessionId: session.id } : {} };
  }
  if (entity === "support_conversations")
    return {
      view: role === "tutor" ? "help" : "messages",
      args: { learner: "Kasangga Support", conversationId: id, contact: true },
    };
  if (entity === "users") return { view: "profile", args: {} };
  return { view: "notifications", args: {} };
}
