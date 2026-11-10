export function paidSession(row) {
  return (
    String(row.payment_status).toLowerCase() === "paid" &&
    ["confirmed", "completed"].includes(
      String(row.booking_status).toLowerCase(),
    )
  );
}
export function sessionLifecycle(row, now = new Date()) {
  const status = String(
    row.booking_status ?? row.bookingStatus ?? row.status,
  ).toLowerCase();
  if (status === "completed") return "Completed";
  if (["cancelled", "canceled"].includes(status)) return "Cancelled";
  const time = (value) =>
    String(value).length === 5
      ? String(value) + ":00"
      : String(value).slice(0, 8);
  const start = new Date(
    row.startAt ||
      (row.session_date ?? row.date) +
        "T" +
        time(row.start_time ?? row.start) +
        "+08:00",
  );
  const end = new Date(
    row.endAt ||
      (row.session_date ?? row.date) +
        "T" +
        time(row.end_time ?? row.end) +
        "+08:00",
  );
  if (now < start) return "Upcoming";
  if (now < end) return "Ongoing";
  return "Awaiting Completion";
}
