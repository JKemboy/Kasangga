import assert from "node:assert/strict";
import { sessionLifecycle } from "../src/services/sessionLifecycle.js";
const raw = {
  booking_status: "confirmed",
  session_date: "2026-11-11",
  start_time: "09:00:00",
  end_time: "10:00:00",
};
const mapped = {
  status: "Confirmed",
  date: raw.session_date,
  start: raw.start_time,
  end: raw.end_time,
  startAt: "2026-11-11T01:00:00Z",
  endAt: "2026-11-11T02:00:00Z",
};
for (const [now, expected] of [
  ["2026-11-11T00:59:59Z", "Upcoming"],
  ["2026-11-11T01:00:00Z", "Ongoing"],
  ["2026-11-11T02:00:00Z", "Awaiting Completion"],
]) {
  assert.equal(sessionLifecycle(raw, new Date(now)), expected);
  assert.equal(sessionLifecycle(mapped, new Date(now)), expected);
}
assert.equal(sessionLifecycle({ ...mapped, status: "Completed" }), "Completed");
assert.equal(
  sessionLifecycle({ ...raw, booking_status: "completed" }),
  "Completed",
);
assert.equal(sessionLifecycle({ ...mapped, status: "Cancelled" }), "Cancelled");
console.log(
  "PASS: raw and mapped session lifecycle at boundaries and dashboard timer refresh.",
);
