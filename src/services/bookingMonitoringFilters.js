const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function bookingSessionType(value) {
  const type = normalize(value);
  return ["in person", "inperson"].includes(type)
    ? "In Person"
    : type === "online"
      ? "Online"
      : value;
}

export function bookingPaymentStatus(booking, payment) {
  const actual = normalize(booking.payment);
  if (["refunded", "partially refunded"].includes(actual))
    return booking.payment;
  const refund = normalize(payment?.refundStatus);
  if (["pending", "approved", "processing", "under review"].includes(refund))
    return "Refund Review";
  if (["declined", "rejected", "denied"].includes(refund))
    return "Decline Refund";
  return booking.payment;
}

export function matchesBookingPayment(value, filter) {
  if (!filter) return true;
  const status = normalize(value);
  if (filter === "Refunded")
    return ["refunded", "partially refunded"].includes(status);
  if (filter === "Refund Review")
    return ["refund review", "refund under review"].includes(status);
  if (filter === "Decline Refund")
    return ["decline refund", "refund declined", "declined refund"].includes(
      status,
    );
  return status === normalize(filter);
}
