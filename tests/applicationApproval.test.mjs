import { test } from "node:test";
import assert from "node:assert/strict";
import {
  approvalChecksComplete,
  manualReviewComplete,
} from "../src/services/applicationApproval.js";

const record = {
  documents: {
    enrollment: { storagePath: "cor.png" },
    grades: { storagePath: "grades.png" },
  },
};
const state = {
  manualReview: {
    reviewedPaths: ["cor.png", "grades.png"],
    identityConfirmed: true,
    currentEnrollment: true,
    gradesRelevant: true,
  },
};
test("manual review can complete approval checks without OCR", () => {
  assert.equal(manualReviewComplete(record, state), true);
  assert.equal(approvalChecksComplete(record, state), true);
});
test("each required document and manual criterion is necessary", () => {
  for (const key of [
    "identityConfirmed",
    "currentEnrollment",
    "gradesRelevant",
  ]) {
    assert.equal(
      approvalChecksComplete(record, {
        manualReview: { ...state.manualReview, [key]: false },
      }),
      false,
    );
  }
  assert.equal(
    approvalChecksComplete(record, {
      manualReview: { ...state.manualReview, reviewedPaths: ["cor.png"] },
    }),
    false,
  );
  assert.equal(
    approvalChecksComplete(
      { documents: { enrollment: record.documents.enrollment } },
      state,
    ),
    false,
  );
});
test("reviewing old files does not approve replacement documents", () => {
  assert.equal(
    approvalChecksComplete(
      {
        documents: {
          ...record.documents,
          grades: { storagePath: "new-grades.png" },
        },
      },
      state,
    ),
    false,
  );
});
test("OCR route still requires both complete checks and information match", () => {
  assert.equal(
    approvalChecksComplete(record, {
      documentStatus: "Complete",
      matchConfirmed: true,
    }),
    true,
  );
  assert.equal(
    approvalChecksComplete(record, { documentStatus: "Complete" }),
    false,
  );
  assert.equal(
    approvalChecksComplete(record, {
      documentStatus: "Incomplete",
      matchConfirmed: true,
    }),
    false,
  );
  assert.equal(approvalChecksComplete(record, null), false);
});
