export function paymentBookingIds(search) {
  const raw = new URLSearchParams(search).get("booking_ids") || "";
  const ids = [...new Set(raw.split(",").filter((id) => /^\d+$/.test(id)))];
  return ids.length <= 100 ? ids : [];
}
export function confirmedPaymentSessions(sessions, ids) {
  if (!ids.length) return [];
  const matches = sessions.filter(
    (session) =>
      ids.includes(String(session.id)) &&
      String(session.paymentStatus).toLowerCase() === "paid" &&
      ["confirmed", "completed"].includes(
        String(session.bookingStatus).toLowerCase(),
      ),
  );
  return ids.every((id) => matches.some((session) => String(session.id) === id))
    ? matches
    : [];
}
