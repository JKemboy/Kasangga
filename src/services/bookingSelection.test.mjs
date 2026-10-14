import assert from "node:assert/strict";
import test from "node:test";
import { bookingTotal, chooseBookingType } from "./bookingSelection.js";
const sessions = [
  { date: "2099-02-01", time: "09:00", duration: 1, type: "" },
  { date: "2099-02-01", time: "10:00", duration: 1, type: "" },
  { date: "2099-02-02", time: "09:00", duration: 1, type: "" },
];
test("same-day and multi-day sessions add their hourly charges", () => {
  assert.equal(bookingTotal(sessions.slice(0, 2), 450), 900);
  assert.equal(bookingTotal(sessions, 450), 1350);
  assert.equal(bookingTotal(sessions.slice(0, 1), 450), 450);
  assert.equal(bookingTotal([], 450), 0);
});
test("set all cannot apply a session type the tutor does not offer", () => {
  assert.strictEqual(
    chooseBookingType(sessions, "all", "In-person", ["Online"]),
    sessions,
  );
  assert.ok(
    chooseBookingType(sessions, "all", "Online", ["Online"]).every(
      (session) => session.type === "Online",
    ),
  );
});
test("both allows mixed session types and set all overrides every row", () => {
  const mixed = chooseBookingType(
    chooseBookingType(sessions, "2099-02-01T09:00", "Online", [
      "Online",
      "In-person",
    ]),
    "2099-02-01T10:00",
    "In-person",
    ["Online", "In-person"],
  );
  assert.deepEqual(
    mixed.map((session) => session.type),
    ["Online", "In-person", ""],
  );
  assert.ok(
    chooseBookingType(mixed, "all", "In-person", ["Online", "In-person"]).every(
      (session) => session.type === "In-person",
    ),
  );
});
