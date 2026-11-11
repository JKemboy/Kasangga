// Publication labels supplied for the handbook and system policy editions.
export const policyCategories = [
  "Case Intake",
  "Case Review",
  "Case Decision",
  "Clearance",
  "Records & Confidentiality",
];
export function policyPresentation(policy) {
  const system = policy.scope === "system";
  return {
    ...policy,
    owner: system ? "System" : "University Policies",
    version: /^\d{4}$/.test(policy.version || "")
      ? policy.version
      : system
        ? "2026"
        : "2021",
    effectiveLabel: policy.effective || policy.added ? null : "Not recorded",
    updatedLabel: policy.updated ? null : "Not recorded",
  };
}
