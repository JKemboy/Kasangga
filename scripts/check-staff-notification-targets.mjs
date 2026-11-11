import assert from "node:assert/strict";
import { isOsweNotification } from "../src/services/osweNotificationScope.js";
import {
  lcoNotificationDestination,
  osweNotificationDestination,
} from "../src/services/staffNotificationTargets.js";

const notification = (entityType, entityId = "12") => ({
  id: "notice-1",
  entityType,
  entityId,
});
for (const entity of [
  "cases",
  "incident_reports",
  "incident_evidence",
  "clearance_reviews",
  "clearance_holds",
])
  assert.equal(isOsweNotification(notification(entity)), true);
for (const entity of [
  "bookings",
  "payments",
  "refunds",
  "services",
  "policies",
  "tutor_applications",
])
  assert.equal(isOsweNotification(notification(entity)), false);
const heldClearance = {
  clearanceDatabaseId: 3,
  status: "On Hold",
  holds: [{ hold_id: 19 }],
};
assert.equal(
  osweNotificationDestination(notification("clearance_holds", 19), {
    clearance: [heldClearance],
  }).record,
  heldClearance,
);
assert.equal(
  osweNotificationDestination(notification("clearance_reviews", 7), {
    clearance: [
      { clearanceDatabaseId: 7, status: "Cleared", caseId: "CASE-9" },
    ],
  }).view,
  "Case Archive",
);
const lcoRoutes = {
  tutor_applications: "Tutor Verification",
  bookings: "Bookings Monitoring",
  services: "Service Management",
  payments: "Payments & Transactions",
  refunds: "Payments & Transactions",
  incident_reports: "Incident Reports",
  support_conversations: "Messages",
  users: "User Management",
  policies: "Policies & Procedures",
};
for (const [type, view] of Object.entries(lcoRoutes)) {
  const row = notification(type);
  assert.deepEqual(lcoNotificationDestination(row), { view, target: row });
}
const report = { id: "5", osweCaseId: "CASE-12", evidence: [{ id: "8" }] };
for (const row of [
  notification("cases"),
  notification("incident_evidence", 8),
]) {
  const target = lcoNotificationDestination(row, { incidents: [report] });
  assert.equal(target.view, "Incident Reports");
  assert.equal(target.target.entityType, "incident_reports");
  assert.equal(target.target.entityId, "5");
  assert.equal(
    row.entityId === "5",
    false,
    "Original notification must stay intact",
  );
}
const record = { caseDatabaseId: 12, reportDatabaseId: 5 };
const records = {
  cases: [record],
  incidents: [{ reportDatabaseId: 5 }],
  evidence: [{ evidenceDatabaseId: 8, reportDatabaseId: 5 }],
  clearance: [{ clearanceDatabaseId: 3 }],
};
for (const row of [
  notification("cases"),
  notification("incident_reports", "5"),
  notification("incident_evidence", "8"),
]) {
  const destination = osweNotificationDestination(row, records);
  assert.equal(destination.view, "Case Review");
  assert.equal(destination.record, record);
}
assert.equal(
  osweNotificationDestination(notification("incident_reports", 5), {
    incidents: records.incidents,
  }).record,
  records.incidents[0],
);
assert.equal(
  osweNotificationDestination(notification("clearance_reviews", "3"), records)
    .record,
  records.clearance[0],
);
assert.equal(
  osweNotificationDestination(notification("policies", 4), records).query,
  "POL-4",
);
assert.equal(
  osweNotificationDestination(notification("incident_evidence", 999), records)
    .record,
  undefined,
);
for (const resolve of [
  osweNotificationDestination,
  lcoNotificationDestination,
]) {
  assert.equal(resolve(notification("system"), records), null);
}
console.log("Staff notification routing checks passed.");
