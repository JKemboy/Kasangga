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
    owner: system ? "System" : "Student Handbook",
    version: /^\d{4}$/.test(policy.version || "")
      ? policy.version
      : system
        ? "2026"
        : "2021",
    effectiveLabel: policy.effective
      ? null
      : system
        ? "August 2026"
        : "Since 2021",
    updatedLabel: policy.updated
      ? null
      : system
        ? "Oct 22, 2026"
        : "Since 2021",
  };
}
