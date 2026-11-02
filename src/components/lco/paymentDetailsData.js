export const paymentBookings = {};
export function refundDecision(record, decision, note) {
  if (record.payment !== "Refund Review" || record.refundDecision)
    throw new Error("This refund is not awaiting a decision.");
  if (!["Approved", "Declined"].includes(decision))
    throw new Error("Invalid refund decision.");
  if (note.trim().length < 15) throw new Error("Enter at least 15 characters.");
  return {
    ...record,
    refundDecision: {
      decision,
      note: note.trim(),
      at: new Date().toISOString(),
      by: "LCO User",
    },
    history: [
      ...(record.history || []),
      {
        to: `Refund ${decision}`,
        reason: note.trim(),
        at: new Date().toISOString(),
        by: "LCO User",
      },
    ],
  };
}
