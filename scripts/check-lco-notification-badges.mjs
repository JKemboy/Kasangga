import assert from "node:assert/strict";
import {
  lcoUnreadNavigationCounts,
  lcoRecordNotificationIds,
} from "../src/services/lcoNotificationBadges.js";

const records = {
  incidents: [{ id: "12", osweCaseId: "CASE-7", evidence: [{ id: "9" }] }],
};
const rows = [
  { id: "1", entityType: "incident_reports", entityId: 12, read: false },
  { id: "2", entityType: "cases", entityId: 7, read: false },
  { id: "3", entityType: "incident_evidence", entityId: 9, read: false },
  { id: "4", entityType: "incident_reports", entityId: 13, read: false },
  { id: "5", entityType: "payments", entityId: 12, read: false },
  { id: "6", entityType: "tutor_applications", entityId: 12, read: true },
];
const counts = lcoUnreadNavigationCounts(rows, records);
assert.equal(counts["Incident Reports"], 4);
assert.equal(counts["Payments & Transactions"], 1);
assert.equal(counts.Notifications, 5);
assert.equal(counts["Tutor Verification"], undefined);
const seen = lcoRecordNotificationIds(rows, records, "incident_reports", "12");
assert.deepEqual(seen, ["1", "2", "3"]);
const updated = rows.map((row) =>
  seen.includes(row.id) ? { ...row, read: true } : row,
);
assert.equal(
  lcoUnreadNavigationCounts(updated, records)["Incident Reports"],
  1,
);
assert.equal(lcoUnreadNavigationCounts(updated, records).Notifications, 2);
assert.deepEqual(
  lcoRecordNotificationIds(rows, records, "incident_reports", null),
  [],
);
assert.equal(rows[0].read, false);
console.log(
  "PASS: unread section badges, related case/evidence reads, record isolation and unrelated payment preservation.",
);
