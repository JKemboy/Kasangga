import test from "node:test";
import assert from "node:assert/strict";
import {
  casePermissions,
  caseReviewLabel,
} from "../src/components/osas/caseProgress.js";

test("opening a case resumes from its persisted review history", () => {
  assert.equal(caseReviewLabel({ status: "Open", history: [] }), "Open Case");
  assert.equal(
    caseReviewLabel({ status: "Open", history: [{ action: "Begin Review" }] }),
    "Continue Review",
  );
  assert.equal(
    caseReviewLabel({ status: "Pending Decision" }),
    "Continue Review",
  );
  assert.equal(caseReviewLabel({ status: "Resolved" }), "View Case");
});

test("every attached evidence must be validated before proceeding", () => {
  const row = { status: "Open" };
  assert.equal(casePermissions(row, []).pending, false);
  assert.equal(
    casePermissions(row, [
      { status: "Validated" },
      { status: "Pending Review" },
    ]).pending,
    false,
  );
  assert.equal(
    casePermissions(row, [{ status: "Validated" }, { status: "Insufficient" }])
      .decision,
    false,
  );
  assert.equal(
    casePermissions(row, [{ status: "Validated" }, { status: "Validated" }])
      .pending,
    true,
  );
});

test("decision and condition completion stay in their workflow stages", () => {
  const evidence = [{ status: "Validated" }];
  assert.equal(casePermissions({ status: "Open" }, evidence).decision, false);
  assert.equal(
    casePermissions({ status: "Pending Decision" }, evidence).decision,
    true,
  );
  const conditional = {
    status: "Pending Completion",
    decision: { condition: "Submit acknowledgement", conditionDone: false },
  };
  assert.equal(casePermissions(conditional, evidence).condition, true);
  assert.equal(
    casePermissions({ ...conditional, archived: true }, evidence).condition,
    false,
  );
});
