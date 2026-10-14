export function paidSession(row) {
  return (
    String(row.payment_status).toLowerCase() === "paid" &&
    ["confirmed", "completed"].includes(
      String(row.booking_status).toLowerCase(),
    )
  );
}
export function sessionLifecycle(row, now = new Date()) {
  if (String(row.booking_status).toLowerCase() === "completed")
    return "Completed";
  const time = (value) =>
    String(value).length === 5
      ? String(value) + ":00"
      : String(value).slice(0, 8);
  const start = new Date(
    row.session_date + "T" + time(row.start_time) + "+08:00",
  );
  const end = new Date(row.session_date + "T" + time(row.end_time) + "+08:00");
  return start <= now && now < end ? "Ongoing" : "Upcoming";
}
