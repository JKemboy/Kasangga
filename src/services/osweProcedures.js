// Reviewed mapping for the OSWE procedure catalog. Titles match the supplied task.
export const osweProcedures = [
  [
    "Receiving Reports from LCO (includes Repeated Rule Violations)",
    "Case Intake",
    "System",
    "LCO reviews reports before referral to OSWE. Repeated Rule Violations referrals require LCO review; OSWE must confirm any violation. Automatic counting remains inactive without configured official semester dates.",
  ],
  [
    "Opening a Case and Notifying the Student",
    "Case Intake",
    "University Policies",
  ],
  ["Evidence Assessment", "Case Review", "University Policies"],
  [
    "Recording a Case Decision (actions, conditions, 3rd-violation rule)",
    "Case Decision",
    "University Policies",
  ],
  ["Clearance Block and Conditions", "Clearance", "University Policies"],
  [
    "OSWE Completion Form: Face-to-Face Submission",
    "Clearance",
    "System",
    "The student downloads the Completion Form from My Reports and submits the completed, signed form in person at the OSWE office. There is no online upload. Downloading the form does not release a clearance hold; OSWE verifies completion.",
  ],
  [
    "Resolving and Archiving a Case",
    "Records & Confidentiality",
    "System",
    "Recorded decisions resolve cases and make them available as read-only records in Case Archive. Clearance follow-up is handled separately. A No Violation decision archives the case without affecting clearance.",
  ],
  [
    "Grave Matters and Referral to the VPAA",
    "Case Decision",
    "University Policies",
  ],
  [
    "Confidentiality, Records and Data Access",
    "Records & Confidentiality",
    "System",
    "Case records are accessed through existing role-authorized KASANGGA views. Access follows the existing database permissions. No new retention period or data-sharing entitlement is established by this procedure.",
  ],
  ["Appeals of Disciplinary Decisions", "Case Decision", "University Policies"],
  ["OSAS Case Handling Procedure", "Case Review", "University Policies"],
].map(([title, category, owner, content]) => ({
  title,
  category,
  owner,
  basis:
    owner === "System"
      ? "System — existing KASANGGA workflow."
      : "University Policies — official Handbook or university procedure pending verification.",
  content: content || "Official procedure content pending verification.",
}));

export function filterProcedures(
  records,
  { category = "", owner = "", query = "" } = {},
) {
  const search = query.trim().toLowerCase();
  return records.filter(
    (p) =>
      (!category || p.category === category) &&
      (!owner || p.owner === owner) &&
      `${p.title} ${p.category} ${p.owner} ${p.content || ""}`
        .toLowerCase()
        .includes(search),
  );
}
