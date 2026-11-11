import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import {
  actionDefaultConditions,
  caseActions,
  requiredDecisionConditions,
  COMPLETION_INSTRUCTION,
  THIRD_VIOLATION_BASIS,
  decisionAppealStatus,
  decisionHandbookBasis,
  pendingClearanceReviews,
  clearanceRequirementsReady,
} from "../src/services/osweDecisionRules.js";
import { completionFormHtml } from "../src/services/myReportPresentation.js";
assert.deepEqual(actionDefaultConditions, {
  Counseled: [
    "Evaluation session with the Guidance Counselor",
    "Recommended program",
  ],
  "Verbal Warning": ["Written apology to OSWE"],
  "Written Warning": ["Written apology", "Community service (Do Day Slip)"],
  "Referred for Further Action": ["Comply with the VPAA’s decision"],
});
assert.equal(caseActions.length, 4);
assert.equal(THIRD_VIOLATION_BASIS, "Student Handbook Section 7.3.b");
assert.equal(decisionAppealStatus(null), "Not recorded");
assert.deepEqual(
  pendingClearanceReviews([
    { status: "Cleared" },
    { status: "Pending Review" },
    { status: "On Hold" },
  ]).map((record) => record.status),
  ["Pending Review", "On Hold"],
);
const readyDecision = {
  conditionTrackingVersion: 2,
  conditions: [{ completed: true }],
  completionForm: { verifiedAt: "2026-11-12T00:00:00Z" },
};
assert.equal(clearanceRequirementsReady([{ decision: readyDecision }]), true);
assert.equal(
  clearanceRequirementsReady([
    { decision: { ...readyDecision, conditions: [{ completed: false }] } },
  ]),
  false,
);
assert.equal(
  clearanceRequirementsReady([
    { decision: { ...readyDecision, completionForm: null } },
  ]),
  false,
);
assert.equal(
  clearanceRequirementsReady([
    { decision: { ...readyDecision, referralPending: true } },
  ]),
  false,
);
assert.match(
  decisionHandbookBasis({
    outcome: "Verbal Warning",
    basis:
      "Manual OSWE assessment; no verified policy-based recommendation available.",
  }),
  /7\.3\.b, p\. 85/,
);
assert.equal(
  decisionHandbookBasis({
    outcome: "Verbal Warning",
    basis: "Specific recorded citation",
  }),
  "Specific recorded citation",
);
assert.equal(decisionHandbookBasis({ outcome: "Unknown" }), "Not recorded");
const server = await createServer({
  server: { middlewareMode: true },
  logLevel: "error",
});
try {
  const { default: RecordedDetails } = await server.ssrLoadModule(
    "/src/components/shared/RecordedDecisionDetails.jsx",
  );
  const legacy = renderToStaticMarkup(
    React.createElement(RecordedDetails, {
      decision: {
        outcome: "Verbal Warning",
        basis:
          "Manual OSWE assessment; no verified policy-based recommendation available.",
        notes: "Validated records support the finding.",
      },
    }),
  );
  assert.ok(legacy.includes("Handbook 7.3.b, p. 85"));
  assert.ok(legacy.includes("Validated records support the finding."));
  assert.ok(!legacy.includes("no verified"));
  for (const outcome of caseActions) {
    const conditions = requiredDecisionConditions(outcome);
    assert.deepEqual(conditions, [
      ...actionDefaultConditions[outcome],
      COMPLETION_INSTRUCTION,
    ]);
    const row = {
      case_id: 1,
      report_id: 2,
      incident_type: "Privacy or Consent Violation",
      decision: {
        outcome,
        basis: "Student Handbook Section 7.3.b <fixture>",
        appeal_status: "Under institutional review",
        conditions: conditions.map((text) => ({ text, completed: false })),
      },
    };
    const html = completionFormHtml(row, { name: "Student <fixture>" });
    assert.ok(html.includes(outcome));
    assert.ok(html.includes("Student Handbook Section 7.3.b &lt;fixture&gt;"));
    assert.ok(html.includes(COMPLETION_INSTRUCTION));
    assert.ok(
      !html.includes("Student <fixture>"),
      "Student input must be escaped",
    );
    assert.doesNotMatch(
      html,
      /<form\b|type=["']file["']/i,
      "Completion Forms must not contain an online submission control",
    );
    const details = renderToStaticMarkup(
      React.createElement(RecordedDetails, { decision: row.decision }),
    );
    for (const label of [
      "Case action",
      "Student Handbook basis",
      "Required conditions",
    ])
      assert.ok(details.includes(label));
    assert.ok(!details.includes("Appeal status"));
    assert.doesNotMatch(
      details,
      /<button|<input/i,
      "OSWE recorded decision details must have no form submission control",
    );
  }
  assert.throws(
    () =>
      completionFormHtml({ case_id: 1, decision: { outcome: "No Violation" } }),
    /No Completion Form/,
  );
  assert.deepEqual(requiredDecisionConditions("No Violation"), []);
  console.log(
    "All four OSWE actions/defaults, recorded decision details, appeal display and download-only form checks passed.",
  );
} finally {
  await server.close();
}
