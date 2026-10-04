import test from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  allocation,
  slotError,
  overlaps,
} from "./fixtures/tutorData.js";
test("earnings only allocate completed paid sessions with fixed shares", () => {
  assert.deepEqual(allocation(seed.sessions), {
    count: 24,
    gross: 10350,
    tutor: 9315,
    osas: 517.5,
    platform: 517.5,
  });
  assert.equal(
    allocation([
      { status: "Completed", payment: "Unpaid", amount: 100 },
      { status: "Confirmed", payment: "Paid", amount: 100 },
    ]).gross,
    0,
  );
});
test("availability blocks class, protected, existing-slot and confirmed-session conflicts", () => {
  const base = { day: 0, date: "2026-09-14", start: 8, end: 9, repeat: false };
  assert.match(slotError(base, [], []), /class schedule/);
  assert.match(slotError({ ...base, start: 17, end: 18 }, [], []), /protected/);
  assert.match(
    slotError({ ...base, start: 10, end: 11 }, seed.slots, []),
    /another availability/,
  );
  assert.match(
    slotError(
      { ...base, day: 5, date: "2026-09-19", start: 16, end: 17 },
      [],
      seed.sessions,
    ),
    /confirmed tutoring/,
  );
  assert.equal(
    slotError({ ...base, start: 12, end: 13 }, seed.slots, seed.sessions),
    "",
  );
});
test("adjacent intervals allowed, self-edit ignored, invalid times rejected", () => {
  assert.equal(overlaps(10, 12, 12, 14), false);
  const slot = seed.slots[0];
  assert.equal(slotError(slot, seed.slots, []), "");
  assert.match(slotError({ ...slot, start: 12, end: 11 }, [], []), /end time/);
  assert.match(slotError({ ...slot, start: NaN }, [], []), /end time/);
});
test("recurring slots cannot overlap confirmed bookings in a different week", () => {
  assert.match(
    slotError(
      { day: 5, date: "2026-09-26", start: 16, end: 17, repeat: true },
      [],
      seed.sessions,
    ),
    /confirmed/,
  );
  assert.equal(
    slotError(
      { day: 5, date: "2026-09-26", start: 16, end: 17, repeat: false },
      [],
      seed.sessions,
    ),
    "",
  );
});
