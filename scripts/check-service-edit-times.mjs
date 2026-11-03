import assert from "node:assert/strict";
import {
  savedTopicRows,
  isUnchangedTopicRow,
} from "../src/components/tutor/workspace/topicTimeOptions.js";
import { validateTopicService } from "../src/components/tutor/workspace/topicServiceRules.js";

const slot = {
  id: "12",
  date: "2026-11-03",
  start: 18,
  end: 19,
  repeat: false,
};
const rows = savedTopicRows(slot, () => "saved-row");
assert.deepEqual(
  rows.map(({ start, end }) => [start, end]),
  [[18, 19]],
);
assert.ok(isUnchangedTopicRow(rows[0]));
assert.ok(!isUnchangedTopicRow({ ...rows[0], start: 17 }));
assert.ok(!isUnchangedTopicRow({ ...rows[0], date: "2026-11-04" }));
assert.deepEqual(
  savedTopicRows({ ...slot, start: 7, end: 11 }, () => "key").map(
    ({ start, end }) => [start, end],
  ),
  [
    [7, 9],
    [9, 11],
  ],
);

// The morning booking belongs to Normalization, not to either afternoon row.
const topic = (name, times) => ({
  name,
  rate: 100,
  types: ["In-person"],
  location: "Library",
  availability: times,
});
const data = {
  name: "Database Systems",
  description: "Tutoring",
  topicDetails: [
    topic("Normalization", savedTopicRows({ ...slot, start: 7, end: 9 })),
    topic("Data Warehousing & Analytics", [
      ...savedTopicRows({ ...slot, start: 15, end: 16 }),
      ...rows,
    ]),
  ],
};
assert.equal(validateTopicService(data).error, "");
const duplicate = structuredClone(data);
duplicate.topicDetails[1].availability.push({ ...rows[0], start: 7, end: 8 });
assert.match(validateTopicService(duplicate).error, /overlaps/);
console.log(
  "PASS: saved ranges, unchanged detection, separate topics, real overlap rejection",
);
