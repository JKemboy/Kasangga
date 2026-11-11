import assert from "node:assert/strict";
import {
  overviewCaseStatus,
  pendingOverviewActions,
} from "../src/services/osweOverviewSummary.js";

const cases = [
  { reportDatabaseId: 1, status: "New" },
  { reportDatabaseId: 2, status: "Under Institutional Review" },
  { reportDatabaseId: 3, status: "Awaiting Evidence", evidenceRequest: {} },
  { reportDatabaseId: 4, status: "Pending Decision" },
  {
    reportDatabaseId: 5,
    status: "Pending Completion",
    decision: { conditions: [{ completed: false }] },
  },
  {
    reportDatabaseId: 6,
    status: "Resolved",
    archived: true,
    decision: { conditions: [{ completed: false }] },
  },
  {
    reportDatabaseId: 7,
    status: "Resolved",
    decision: { conditions: [{ completed: true }] },
  },
];
assert.deepEqual(cases.map(overviewCaseStatus), [
  "Open",
  "Under Review",
  "Under Review",
  "Pending Decision",
  "Resolved",
  "Resolved",
  "Resolved",
]);
const pending = pendingOverviewActions(
  cases,
  [{ status: "Pending Review" }, { status: "Blocked" }, { status: "Cleared" }],
  [
    { reportDatabaseId: 1, status: "Pending" },
    { reportDatabaseId: 2, status: "Validated" },
    { reportDatabaseId: 3, status: "Insufficient" },
    { reportDatabaseId: 5, status: "Pending" },
  ],
);
assert.equal(pending.evidence.length, 1);
assert.equal(pending.review.length, 4);
assert.equal(pending.clearance.length, 2);
assert.deepEqual(pendingOverviewActions([], [], []), {
  evidence: [],
  review: [],
  clearance: [],
});
console.log(
  "PASS: overview status buckets, new referrals, pending evidence, blocked clearances and legacy status compatibility.",
);
