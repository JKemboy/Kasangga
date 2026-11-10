import assert from "node:assert/strict";
import {
  incidentGroups,
  SESSION_PAYMENT,
  HANDBOOK,
  REPEATED,
  incidentCategory,
  canonicalIncidentType,
  validateIncidentSelection,
} from "../src/services/incidentTypes.js";
import { submitIncidentReport } from "../src/services/incidentReports.js";
import { reviewIncident } from "../src/components/lco/incidentData.js";
assert.deepEqual(incidentGroups[SESSION_PAYMENT], [
  "No-Show",
  "Late Arrival or Session Ended Early",
  "Late Cancellation",
  "Payment or Refund Issue",
  "Meeting Link or Technical Issue",
  "Request to Pay Outside KASANGGA",
  "Other",
]);
assert.deepEqual(incidentGroups[HANDBOOK], [
  "Harassment or Threats",
  "Sexual Harassment",
  "Bullying or Cyberbullying",
  "Disrespectful or Abusive Behavior",
  "Discrimination",
  "Privacy or Consent Violation",
  "Academic Dishonesty",
  "False Information or Identity",
  "Safety Concern",
]);
assert.equal(Object.values(incidentGroups).flat().includes(REPEATED), false);
for (const [category, types] of Object.entries(incidentGroups))
  for (const type of types) {
    assert.equal(incidentCategory(type), category);
    validateIncidentSelection(category, type);
  }
for (const [category, type] of [
  ["", ""],
  [SESSION_PAYMENT, ""],
  [SESSION_PAYMENT, "Sexual Harassment"],
  [HANDBOOK, REPEATED],
])
  assert.throws(() => validateIncidentSelection(category, type));
assert.equal(
  canonicalIncidentType("Payment concern"),
  "Payment or Refund Issue",
);
assert.equal(incidentCategory("Platform / Technical"), SESSION_PAYMENT);
assert.equal(incidentCategory(REPEATED), HANDBOOK);
const notes =
  "LCO reviewed the records and recorded the appropriate resolution.";
assert.equal(
  reviewIncident(
    { type: "No-Show", status: "Pending Review" },
    "Resolved by LCO",
    notes,
  ).status,
  "Resolved by LCO",
);
assert.equal(
  reviewIncident(
    { type: "Sexual Harassment", status: "Pending Review" },
    "Referred to OSWE",
    notes,
  ).referral,
  "Referred to OSWE",
);
assert.throws(() =>
  reviewIncident(
    { type: "No-Show", status: "Pending Review" },
    "Referred to OSWE",
    notes,
  ),
);
assert.throws(() =>
  reviewIncident(
    { type: "Sexual Harassment", status: "Pending Review" },
    "Resolved by LCO",
    notes,
  ),
);
let request;
const client = {
  auth: { getUser: async () => ({ data: { user: { id: "fixture-user" } } }) },
  storage: { from: () => ({ upload: async () => ({ error: null }) }) },
  rpc: async (name, args) => {
    request = { name, args };
    return { data: 42 };
  },
};
const evidence = [new Blob(["%PDF-fixture"], { type: "application/pdf" })];
for (const role of ["learner", "tutor"]) {
  const result = await submitIncidentReport(
    {
      sessionId: 7,
      incidentCategory: SESSION_PAYMENT,
      incidentType: "No-Show",
      reason: `A ${role} reports this session incident for review.`,
      evidence,
    },
    client,
  );
  assert.equal(result.id, "42");
  assert.equal(request.name, "submit_incident_report");
  assert.equal(request.args.p_category, SESSION_PAYMENT);
  assert.equal(request.args.p_type, "No-Show");
}
await assert.rejects(
  submitIncidentReport(
    {
      sessionId: 7,
      incidentCategory: HANDBOOK,
      incidentType: REPEATED,
      evidence,
    },
    client,
  ),
);
await submitIncidentReport({ caseId: 9, evidence }, client);
assert.equal(
  request.name,
  "attach_incident_evidence",
  "Evidence follow-up must not require new incident classification",
);
console.log(
  "Incident catalog, participant submission, follow-up and LCO routing checks passed.",
);
