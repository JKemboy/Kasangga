import {
  incidentCategory,
  SESSION_PAYMENT,
  HANDBOOK,
} from "../../services/incidentTypes.js";
export function reviewIncident(record, action, notes) {
  if (
    [
      "LCO Screening Complete",
      "Resolved by LCO",
      "Resolved by OSWE",
      "Under OSWE Review",
    ].includes(record.status)
  )
    throw new Error("This review is complete.");
  if (
    !["Resolved by LCO", "Referred to OSWE"].includes(action) ||
    (action === "Resolved by LCO" &&
      incidentCategory(record.type) !== SESSION_PAYMENT) ||
    (action === "Referred to OSWE" &&
      incidentCategory(record.type) !== HANDBOOK)
  )
    throw new Error("Choose an action appropriate for this report.");
  if (notes.trim().length < 15)
    throw new Error("Enter at least 15 characters.");
  return {
    ...record,
    status: action === "Referred to OSWE" ? "LCO Screening Complete" : action,
    referral: action === "Referred to OSWE" ? action : record.referral,
    history: [
      ...(record.history || []),
      {
        action,
        notes: notes.trim(),
        at: new Date().toISOString(),
        by: "LCO User",
      },
    ],
  };
}
