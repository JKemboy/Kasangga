import assert from "node:assert/strict";
import test from "node:test";
import { paidSession, sessionLifecycle } from "./sessionLifecycle.js";
const row = {
  booking_status: "confirmed",
  payment_status: "paid",
  session_date: "2026-10-14",
  start_time: "09:00:00",
  end_time: "10:00:00",
};
test("Ongoing follows Manila start and end boundaries", () => {
  assert.equal(
    sessionLifecycle(row, new Date("2026-10-14T00:59:59Z")),
    "Upcoming",
  );
  assert.equal(
    sessionLifecycle(row, new Date("2026-10-14T01:00:00Z")),
    "Ongoing",
  );
  assert.equal(
    sessionLifecycle(row, new Date("2026-10-14T01:59:59Z")),
    "Ongoing",
  );
  assert.notEqual(
    sessionLifecycle(row, new Date("2026-10-14T02:00:00Z")),
    "Ongoing",
  );
  assert.equal(
    sessionLifecycle({ ...row, booking_status: "completed" }),
    "Completed",
  );
});
test("My Sessions excludes every unpaid, cancelled and refunded row", () => {
  assert.ok(paidSession(row));
  assert.ok(paidSession({ ...row, booking_status: "completed" }));
  for (const payment_status of [
    "unpaid",
    "pending",
    "refunded",
    "partially_refunded",
  ])
    assert.equal(paidSession({ ...row, payment_status }), false);
  for (const booking_status of ["pending", "cancelled", "canceled"])
    assert.equal(paidSession({ ...row, booking_status }), false);
});
