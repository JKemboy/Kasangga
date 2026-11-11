import assert from "node:assert/strict";
import { storedNotificationTarget } from "../src/services/studentNotificationTargets.js";
import { notificationDestination } from "../src/components/tutor/workspace/notificationTargets.js";
import { osweNotificationDestination } from "../src/services/staffNotificationTargets.js";

const row = (entity, id = "7") => ({
  related_entity_type: entity,
  related_entity_id: id,
});
for (const role of ["learner", "tutor"]) {
  for (const entity of ["clearance_reviews", "clearance_holds"]) {
    assert.deepEqual(storedNotificationTarget(row(entity), role), {
      view: "reports",
      args: { tab: "received" },
    });
  }
  assert.deepEqual(storedNotificationTarget(row("cases"), role), {
    view: "reports",
    args: { caseId: "7" },
  });
  assert.deepEqual(storedNotificationTarget(row("bookings"), role), {
    view: "sessions",
    args: { sessionId: "7" },
  });
  const payment = storedNotificationTarget(row("payments"), role, {
    sessions: [{ id: "12", paymentId: "7", transaction: "TX-7" }],
  });
  assert.equal(payment.view, role === "tutor" ? "earnings" : "sessions");
  assert.deepEqual(
    payment.args,
    role === "tutor" ? { transactionId: "TX-7" } : { sessionId: "12" },
  );
}
assert.equal(
  storedNotificationTarget(row("services"), "learner").view,
  "find-tutor",
);
assert.equal(
  storedNotificationTarget(row("services"), "tutor").view,
  "services",
);
assert.equal(
  storedNotificationTarget(row("refunds"), "learner").view,
  "sessions",
);
assert.equal(
  storedNotificationTarget(row("refunds"), "tutor").view,
  "earnings",
);
const clearance = {
  notificationId: 19,
  notificationType: "osas_queue_update",
  entityType: "clearance_reviews",
  view: "notifications",
};
const staff = notificationDestination(clearance, {
  roles: ["learner", "oswe"],
});
const url = new URL(staff.href, "https://example.test");
assert.equal(url.pathname, "/oswe-dashboard");
assert.equal(url.searchParams.get("section"), "Student Clearance Review");
assert.equal(url.searchParams.get("notification"), "19");
assert.equal(notificationDestination(clearance, { roles: ["learner"] }), null);
assert.equal(
  notificationDestination({ view: "notifications" }),
  null,
  "No button that reopens the same inbox",
);
assert.equal(
  notificationDestination({
    notificationType: "case_evidence_requested",
    view: "reports",
  }),
  null,
);
assert.equal(
  osweNotificationDestination(
    { entityType: "cases", entityId: 3 },
    { cases: [{ caseDatabaseId: 3, decision: {} }] },
  ).view,
  "Case Archive",
);
assert.equal(
  osweNotificationDestination({
    entityType: "clearance_reviews",
    entityId: 999,
  }).view,
  "Student Clearance Review",
);
console.log(
  "PASS: student routes, payment/session targets, role-authorized staff links, archive routing, and inbox loop prevention.",
);
