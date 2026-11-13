import assert from "node:assert/strict";
import { reportActivity } from "../src/services/myReportPresentation.js";

const decision = { type: "decision", at: "2026-11-11T16:29:52.620375Z" };
const report = {
  referred_at: "2026-11-11T16:27:00Z",
  opened_at: "2026-11-11T16:28:00Z",
  decision: { outcome: "Written Warning" },
  activity: [
    { type: "opened", at: "2026-11-11T16:28:00Z" },
    decision, decision, decision,
    { type: "condition", at: "2026-11-11T16:32:28Z" },
    { type: "condition", at: "2026-11-11T16:32:29Z" },
    { type: "condition", at: "2026-11-11T16:32:30Z" },
    { type: "archive", at: "2026-11-11T16:33:00Z" },
    { type: "condition", at: "2026-11-12T16:32:30Z" },
    { ...decision, at: "2026-11-12T16:33:00Z" },
  ],
};
const activity = reportActivity(report, true);
assert.equal(activity.filter((e) => e.type === "decision").length, 2);
assert.equal(activity.filter((e) => e.type === "condition").length, 2);
assert.equal(activity[3].at, "2026-11-11T16:32:30Z");
assert.equal(activity[4].title, "Case archived");
assert.equal(activity.filter((e) => e.title === "Case review started by OSWE").length, 1);
assert.deepEqual(reportActivity({}, true), []);
const review = { title: "LCO reviewed this report", at: "2026-11-11T16:30:00Z" };
const filed = reportActivity({
  submitted_at: "2026-11-11T16:27:00Z",
  admin_activity: [review, review, { ...review, at: "2026-11-12T16:30:00Z" }],
});
assert.equal(filed.length, 3);
assert.equal(report.activity.length, 10, "Source history must remain intact");
console.log("PASS: shared tutor/learner activity deduplicates decisions and summarizes condition edits while preserving later events and source history.");
