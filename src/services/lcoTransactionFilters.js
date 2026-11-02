const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();

export function matchesLcoTransaction(record, filter, transferred = []) {
  if (!filter) return true;
  const payment = normalize(record.paymentStatus || record.payment);
  const refund = normalize(record.refundStatus);
  const reviewing =
    ["pending", "approved", "processing"].includes(refund) ||
    ["refund review", "refund under review"].includes(
      normalize(record.payment),
    );
  if (filter === "Transferred")
    return !!record.transferredAt || transferred.includes(record.id);
  if (filter === "Refunded")
    return ["refunded", "partially refunded"].includes(payment);
  if (filter === "Refund Review")
    return reviewing && !["refunded", "partially refunded"].includes(payment);
  if (filter === "Processing")
    return ["pending", "processing", "awaiting payment"].includes(payment);
  if (filter === "Paid") return payment === "paid" && !reviewing;
  return payment === normalize(filter);
}
