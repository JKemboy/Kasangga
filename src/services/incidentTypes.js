export const SESSION_PAYMENT = "Session / Payment Issue";
export const HANDBOOK = "Student Handbook Violation";
export const REPEATED = "Repeated Rule Violations";
export function incidentConfirmationLabel(status) {
  return status === "confirmed"
    ? "Confirmed by OSWE"
    : status === "not_confirmed"
      ? "Not confirmed by OSWE"
      : "Pending OSWE confirmation";
}
export const incidentGroups = {
  [SESSION_PAYMENT]: [
    "No-Show",
    "Late Arrival or Session Ended Early",
    "Late Cancellation",
    "Payment or Refund Issue",
    "Meeting Link or Technical Issue",
    "Request to Pay Outside KASANGGA",
    "Other",
  ],
  [HANDBOOK]: [
    "Harassment or Threats",
    "Sexual Harassment",
    "Bullying or Cyberbullying",
    "Disrespectful or Abusive Behavior",
    "Discrimination",
    "Privacy or Consent Violation",
    "Academic Dishonesty",
    "False Information or Identity",
    "Safety Concern",
  ],
};
const aliases = {
  "no-show": "No-Show",
  "payment concern": "Payment or Refund Issue",
  "technical issue": "Meeting Link or Technical Issue",
  "platform / technical": "Meeting Link or Technical Issue",
  "inappropriate behavior or harassment": "Harassment or Threats",
  harassment: "Harassment or Threats",
  "academic misconduct": "Academic Dishonesty",
  misconduct: "Disrespectful or Abusive Behavior",
};
export function canonicalIncidentType(value) {
  const text = String(value || "").trim();
  return (
    [...Object.values(incidentGroups).flat(), REPEATED].find(
      (type) => type.toLowerCase() === text.toLowerCase(),
    ) ||
    aliases[text.toLowerCase()] ||
    text
  );
}
export function incidentCategory(value) {
  const type = canonicalIncidentType(value);
  return (
    Object.entries(incidentGroups).find(([, types]) =>
      types.includes(type),
    )?.[0] || (type === REPEATED ? HANDBOOK : "Uncategorized historical report")
  );
}
export function validateIncidentSelection(category, type) {
  if (!Object.hasOwn(incidentGroups, category))
    throw new Error("Select an incident category.");
  if (!incidentGroups[category].includes(type))
    throw new Error("Select an incident type in this category.");
}
