import assert from "node:assert/strict";
import test from "node:test";
import { validateTopicService } from "./topicServiceRules.js";

const topic = (changes = {}) => ({
  name: "Derivatives",
  rate: "350",
  types: ["Online"],
  meetingLink: "https://meet.google.com/abc-defg-hij",
  location: "",
  availability: [{ date: "2099-02-01", start: 9, end: 10, repeat: false }],
  ...changes,
});
const validate = (topics) =>
  validateTopicService({
    name: "Calculus",
    description: "Calculus tutoring",
    topicDetails: topics,
  });
test("one service keeps separate topic rates and schedules", () => {
  const result = validate([
    topic(),
    topic({
      name: "Integrals",
      rate: "650",
      types: ["In-person"],
      meetingLink: "",
      location: "CCIS Lab 1",
      availability: [{ date: "2099-02-02", start: 9, end: 10 }],
    }),
  ]);
  assert.equal(result.error, "");
  assert.deepEqual(
    result.values.topicDetails.map((row) => row.rate),
    ["350", "650"],
  );
});
test("online needs a secure link and in-person needs a meeting place", () => {
  assert.match(
    validate([topic({ meetingLink: "" })]).error,
    /HTTPS meeting link/,
  );
  assert.match(
    validate([topic({ meetingLink: "javascript:alert(1)" })]).error,
    /HTTPS meeting link/,
  );
  assert.match(
    validate([topic({ types: ["In-person"] })]).error,
    /meeting place/,
  );
  assert.equal(
    validate([
      topic({ types: ["In-person"], location: "Lab 1", meetingLink: "" }),
    ]).error,
    "",
  );
});
test("both requires the link and place", () => {
  assert.match(
    validate([topic({ types: ["Online", "In-person"] })]).error,
    /meeting place/,
  );
  assert.equal(
    validate([topic({ types: ["Online", "In-person"], location: "Lab 1" })])
      .error,
    "",
  );
});
test("overlapping topics are rejected, adjacent hours are allowed", () => {
  assert.match(
    validate([
      topic(),
      topic({
        name: "Integrals",
        availability: [{ date: "2099-02-01", start: 9.5, end: 10.5 }],
      }),
    ]).error,
    /overlaps/,
  );
  assert.equal(
    validate([
      topic(),
      topic({
        name: "Integrals",
        availability: [{ date: "2099-02-01", start: 10, end: 11 }],
      }),
    ]).error,
    "",
  );
});
test("each topic requires a date and exactly one hour per slot", () => {
  assert.match(
    validate([topic({ availability: [] })]).error,
    /dates and times/,
  );
  assert.match(
    validate([
      topic({ availability: [{ date: "2099-02-01", start: 9, end: 11 }] }),
    ]).error,
    /one-hour/,
  );
});
