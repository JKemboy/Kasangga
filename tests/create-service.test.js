import test from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/components/tutor/workspace/data.js";
import {
  createService,
  editService,
  serviceAvailabilityErrors,
} from "../src/components/tutor/workspace/createService.js";
import {
  eventsForDate,
  parseDate,
} from "../src/components/tutor/workspace/schedule.js";
const now = new Date("2026-09-17T00:00:00Z");
const values = {
  name: "New Calculus Workshop",
  subtitle: "Calculus",
  category: "Mathematics",
  level: "College",
  description: "Guided practice",
  topics: "Derivatives",
  rate: "350",
  type: "Online",
};
const rows = [{ id: "draft", date: "2026-09-18", start: 18, end: 19 }];
test("editing preserves bookings and existing slots while validating new dates", () => {
  const original = seed.services[0];
  const next = editService(
    seed,
    original.id,
    { ...original, description: "Updated guidance" },
    [],
    now,
  );
  assert.equal(next.services[0].description, "Updated guidance");
  assert.equal(next.services[0].status, original.status);
  assert.deepEqual(next.sessions, seed.sessions);
  assert.deepEqual(next.slots, seed.slots);
  const added = editService(
    seed,
    original.id,
    { ...original, description: "Updated guidance" },
    rows,
    now,
  );
  assert.equal(added.slots.at(-1).serviceId, original.id);
  assert.throws(
    () =>
      editService(
        seed,
        original.id,
        original,
        [{ ...rows[0], date: "2020-01-01" }],
        now,
      ),
    /future/,
  );
  assert.throws(() => editService(seed, "missing", original, [], now));
});
test("creating a service saves linked availability and retains existing records", () => {
  const before = structuredClone(seed);
  const next = createService(seed, values, rows, now);
  assert.deepEqual(seed, before);
  assert.equal(next.services.length, seed.services.length + 1);
  assert.equal(next.slots.length, seed.slots.length + 1);
  assert.equal(next.slots.at(-1).serviceId, next.services[0].id);
  assert.equal(next.slots.at(-1).type, "Online");
  const events = eventsForDate(parseDate("2026-09-18"), {
    slots: next.slots,
    sessions: next.sessions,
    classes: [],
  });
  assert.ok(
    events.some((e) => e.title === values.name && e.kind === "available"),
  );
});
test("creation rejects missing availability, overlapping rows, class conflicts and past times", () => {
  assert.throws(() => createService(seed, values, [], now), /at least one/);
  assert.throws(
    () =>
      createService(seed, values, [...rows, { ...rows[0], id: "second" }], now),
    /overlaps/,
  );
  assert.throws(
    () =>
      createService(seed, values, [{ ...rows[0], start: 15, end: 16 }], now),
    /class/,
  );
  assert.throws(
    () => createService(seed, values, rows, new Date("2026-09-20")),
    /future/,
  );
  assert.deepEqual(serviceAvailabilityErrors(rows, "Online", seed, now), [""]);
});
test("a reserved service slot cannot be assigned to a second service", () => {
  const next = createService(seed, values, rows, now);
  assert.throws(
    () =>
      createService(next, { ...values, name: "Another workshop" }, rows, now),
    /overlaps/,
  );
});
