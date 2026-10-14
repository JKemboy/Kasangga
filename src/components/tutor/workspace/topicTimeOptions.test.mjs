import assert from "node:assert/strict";
import test from "node:test";
import { groupTopicDates, topicTimeOptions } from "./topicTimeOptions.js";
const date = "2099-02-03";
const day = (new Date(date + "T12:00:00").getDay() + 6) % 7;
const now = new Date("2098-01-01T00:00:00Z");
const base = {
  date,
  now,
  slots: [{ day, repeat: true, start: 8, end: 12, serviceId: null }],
};
test("multiple times share one date group and different dates remain separate", () => {
  const groups = groupTopicDates([
    { key: "a", date, start: 8, end: 9 },
    { key: "b", date, start: 10, end: 11 },
    { key: "c", date: "2099-02-04", start: 9, end: 10 },
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].rows.length, 2);
});
test("only one-hour ranges inside general tutor availability are offered", () => {
  assert.deepEqual(topicTimeOptions(base), [8, 8.5, 9, 9.5, 10, 10.5, 11]);
  assert.deepEqual(topicTimeOptions({ ...base, date: "2099-02-04" }), []);
});
test("classes, pending bookings and selected topic times remove overlapping options", () => {
  assert.deepEqual(
    topicTimeOptions({
      ...base,
      classes: [[day, 8, 9]],
      bookings: [
        { date, start: "09:00:00", end: "10:00:00", status: "Pending" },
      ],
      topics: [
        { availability: [{ key: "selected", date, start: 10, end: 11 }] },
      ],
    }),
    [11],
  );
});
test("the current selection is retained but other topic and service times are blocked", () => {
  assert.deepEqual(
    topicTimeOptions({
      ...base,
      rowKey: "selected",
      topics: [{ availability: [{ key: "selected", date, start: 8, end: 9 }] }],
      slots: [
        ...base.slots,
        { day, repeat: true, start: 9, end: 11, serviceId: "other" },
      ],
    }),
    [8, 11],
  );
});
test("without existing general availability use class-free times within working hours", () => {
  const options = topicTimeOptions({ date, now, classes: [[day, 8, 10]] });
  assert.ok(options.includes(7));
  assert.ok(options.includes(10));
  assert.ok(!options.includes(8));
  assert.ok(options.every((start) => start >= 7 && start + 1 <= 21));
});
test("past dates have no offered times", () => {
  assert.deepEqual(
    topicTimeOptions({ ...base, now: new Date("2100-01-01T00:00:00Z") }),
    [],
  );
});
