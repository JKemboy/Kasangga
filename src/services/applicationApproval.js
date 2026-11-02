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

export function subjectGradesQualified(record, grades = {}) {
  return (
    Array.isArray(record.subjects) &&
    record.subjects.length > 0 &&
    record.subjects.every((subject) => {
      const value = String(grades[subject] ?? "").trim();
      const grade = Number(value);
      return /^\d+(?:\.\d+)?$/.test(value) && grade >= 1 && grade <= 1.75;
    })
  );
}

export function approvalChecksComplete(record, state = {}) {
  return (
    subjectGradesQualified(record, state?.manualReview?.subjectGrades) &&
    (manualReviewComplete(record, state) ||
      (state?.documentStatus === "Complete" && !!state?.matchConfirmed))
  );
}
