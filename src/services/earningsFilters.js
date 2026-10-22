export const earningsDateOptions = [
  "All dates",
  "This Week",
  "Last 30 days",
  "Last Month",
  "Last Year",
];
export function matchesEarningsDate(value, period, now = new Date()) {
  if (period === "All dates") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  const today = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(today);
  if (period === "This Week")
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  else if (period === "Last 30 days") start.setUTCDate(start.getUTCDate() - 29);
  else if (period === "Last Month") {
    start.setUTCDate(1);
    end.setTime(start.getTime());
    start.setUTCMonth(start.getUTCMonth() - 1);
  } else if (period === "Last Year") {
    start.setUTCMonth(0, 1);
    end.setTime(start.getTime());
    start.setUTCFullYear(start.getUTCFullYear() - 1);
  } else return false;
  return (
    value >= start.toISOString().slice(0, 10) &&
    value < end.toISOString().slice(0, 10)
  );
}

export const payoutStatusOptions = [
  "All",
  "Transferred",
  "Pending for Transfer",
  "Awaiting Completion",
  "On Hold",
];
export function payoutStatus(session) {
  const payment = String(session.payment || "").toLowerCase();
  const status = String(session.status || "").toLowerCase();
  if (
    payment.includes("refund") ||
    ["cancelled", "disputed", "on hold"].includes(status) ||
    ["pending", "under_review"].includes(
      String(session.refundStatus || "").toLowerCase(),
    )
  )
    return "On Hold";
  if (session.transferredAt) return "Transferred";
  if (payment !== "paid") return "On Hold";
  return status === "completed"
    ? "Pending for Transfer"
    : "Awaiting Completion";
}
