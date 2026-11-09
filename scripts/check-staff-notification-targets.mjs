import assert from "node:assert/strict";
import {
  lcoNotificationDestination,
  osweNotificationDestination,
} from "../src/services/staffNotificationTargets.js";

const notification = (entityType, entityId = "12") => ({
  id: "notice-1",
  entityType,
  entityId,
});
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
