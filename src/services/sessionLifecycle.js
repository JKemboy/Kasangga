export function paidSession(row) {
  return (
    String(row.payment_status).toLowerCase() === "paid" &&
    ["confirmed", "completed"].includes(
      String(row.booking_status).toLowerCase(),
    )
  );
}
export function sessionLifecycle(row, now = new Date()) {
  const status = String(row.booking_status).toLowerCase();
  if (status === "completed")
    return "Completed";
  const time = (value) =>
    String(value).length === 5
      ? String(value) + ":00"
      : String(value).slice(0, 8);
  const start = new Date(
    row.session_date + "T" + time(row.start_time) + "+08:00",
  );
  const end = new Date(row.session_date + "T" + time(row.end_time) + "+08:00");
  if (now < start) return "Upcoming";
  if (now < end) return "Ongoing";
  return now < end ? "Ongoing" : "Awaiting Completion";
}
