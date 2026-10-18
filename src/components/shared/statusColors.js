import "./status-colors.css";
export function statusTone(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  if (
    [
      "open",
      "high",
      "urgent",
      "insufficient",
      "requires resolution",
      "rejected",
      "failed",
      "suspended",
      "cancelled",
      "not matched",
      "invalid file",
    ].includes(text)
  )
    return "red";
  if (
    [
      "resolved",
      "resolved by admin",
      "resolved by osas",
      "pending decision",
      "validated",
      "cleared",
      "case created",
      "admin screening complete",
      "approved",
      "active",
      "verified",
      "paid",
      "completed",
      "confirmed",
      "transferred",
      "matched",
      "complete",
      "reviewed",
    ].includes(text)
  )
    return "green";
  if (
    [
      "awaiting evidence",
      "low",
      "requires clarification",
      "on hold",
      "platform / technical",
    ].includes(text)
  )
    return "blue";
  if (["referred to osas", "assessed by osas"].includes(text)) return "purple";
  if (["not referred", "not required", "archived", "inactive"].includes(text))
    return "gray";
  return "amber";
}
export const statusClass = (value, base = "") => base + " ct-status ct-status-" + statusTone(value);
