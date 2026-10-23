import { DOCUMENTS } from "../components/learner/application/applicationRules.js";

export function manualReviewComplete(record, state = {}) {
  const manual = state?.manualReview || {};
  return (
    DOCUMENTS.filter((doc) => doc.required).every((doc) => {
      const path = record.documents?.[doc.id]?.storagePath;
      return path && manual.reviewedPaths?.includes(path);
    }) &&
    !!manual.identityConfirmed &&
    !!manual.currentEnrollment &&
    !!manual.gradesRelevant
  );
}

export function approvalChecksComplete(record, state = {}) {
  return (
    manualReviewComplete(record, state) ||
    (state?.documentStatus === "Complete" && !!state?.matchConfirmed)
  );
}
