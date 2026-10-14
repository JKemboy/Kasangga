import assert from "node:assert/strict";
import test from "node:test";
import { availableBookingTimes } from "./availabilityTimes.js";

const date = "2099-01-06";
const weekLater = "2099-01-13";
const dayName = new Date(`${date}T12:00:00+08:00`)
  .toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Manila" })
  .toLowerCase();
const now = new Date("2098-01-01T00:00:00Z");
const dated = {
  id: "dated",
  serviceId: "1",
  date,
  dayName,
  start: 9,
  end: 11,
  repeat: false,
};
const weekly = {
  id: "weekly",
  serviceId: null,
  dayName,
  start: 13,
  end: 15,
  repeat: true,
};
const times = (slots, day, service = "1", classes = [], bookings = []) =>
  availableBookingTimes(slots, day, 1, service, now, classes, bookings).map(
    (option) => option.value,
  );

test("date-specific service availability does not repeat the following week", () => {
  assert.deepEqual(times([dated], date), ["09:00", "09:30", "10:00"]);
  assert.deepEqual(times([dated], weekLater), []);
});
test("weekly availability and date-specific service times work together", () => {
  assert.deepEqual(times([dated, weekly], date), [
    "09:00",
    "09:30",
    "10:00",
    "13:00",
    "13:30",
    "14:00",
  ]);
  assert.deepEqual(times([dated, weekly], weekLater), [
    "13:00",
    "13:30",
    "14:00",
  ]);
  assert.deepEqual(times([dated, weekly], date, "2"), [
    "13:00",
    "13:30",
    "14:00",
  ]);
});
test("class times and booked times block both sources of availability", () => {
  assert.deepEqual(
    times(
      [dated, weekly],
      date,
      "1",
      [{ dayName, start: "13:00", end: "14:00" }],
      [{ date, start: "09:00", end: "10:00" }],
    ),
    ["10:00", "14:00"],
  );
});
test("overlapping weekly and dated slots produce one option for each start time", () => {
  const general = { ...dated, id: "general", repeat: true, serviceId: null };
  const options = availableBookingTimes([general, dated], date, 1, "1", now);
  assert.equal(options.length, 3);
  assert.ok(options.every((option) => option.slotId === "dated"));
});
test("topic-specific availability stays within the selected topic", () => {
  const slots = [
    { ...dated, topicId: "10" },
    { ...weekly, topicId: "20", serviceId: "1" },
  ];
  assert.deepEqual(
    availableBookingTimes(slots, date, 1, "1", now, [], [], "10").map(
      (option) => option.value,
    ),
    ["09:00", "09:30", "10:00"],
  );
  assert.deepEqual(
    availableBookingTimes(slots, date, 1, "1", now, [], [], "20").map(
      (option) => option.value,
    ),
    ["13:00", "13:30", "14:00"],
  );
});
