export function studentNavigationCounts(role, inbox, workspace) {
  const sessions = inbox.sessions || [];
  const reviews = workspace?.reviews || [];
  return {
    messages: (inbox.threads || []).reduce(
      (n, thread) => n + Number(thread.unread || 0),
      0,
    ),
    notifications: (inbox.notifications || []).filter((n) => !n.read).length,
    sessions: sessions.filter(
      (s) =>
        String(s.bookingStatus || s.status).toLowerCase() === "confirmed" &&
        ["paid", "partially refunded"].includes(
          String(s.paymentStatus || s.payment).toLowerCase(),
        ),
    ).length,
    ...(role === "learner"
      ? {
          reviews: (workspace?.sessions || []).filter(
            (s) =>
              s.bookingStatus === "Completed" &&
              ["Paid", "Partially Refunded", "Refunded"].includes(
                s.paymentStatus,
              ) &&
              !reviews.some((r) => String(r.sessionId) === String(s.id)),
          ).length,
        }
      : {}),
  };
}
