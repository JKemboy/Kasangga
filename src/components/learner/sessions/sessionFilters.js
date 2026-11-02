export function filterSessions(
  sessions,
  lifecycle,
  date = "all",
  paymentStatus = "all",
) {
  return sessions.filter(
    (session) =>
      (session.lifecycle === lifecycle ||
        (lifecycle === "Ongoing" &&
          session.lifecycle === "Awaiting Completion")) &&
      (date === "all" || session.date === date) &&
      (paymentStatus === "all" || session.paymentStatus === paymentStatus),
  );
}
