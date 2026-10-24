import { useOsasDatabase } from "./OsasDatabaseContext.jsx";
import { input } from "../tutor/workspace/ui.jsx";

export function decisionPolicies(policies = []) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return policies.filter(
    (p) => p.status === "Active" && (!p.effective || p.effective <= today),
  );
}
export const policyReference = (policy) =>
  [policy.title, policy.version].filter(Boolean).join(" - ");

export default function PolicyReference({ value, onChange }) {
  const database = useOsasDatabase();
  const policies = decisionPolicies(database?.records?.policies);
  return (
    <>
      <select
        name="basis"
        aria-label="Policy reference"
        className={input}
        required
        {...(value !== undefined ? { value, onChange } : { defaultValue: "" })}
      >
        <option value="">Select a policy from Policies &amp; Procedures</option>
        {policies.map((policy) => (
          <option key={policy.id} value={policyReference(policy)}>
            {policyReference(policy)}
          </option>
        ))}
      </select>
      <small>
        {policies.length
          ? "Active policies from Policies & Procedures."
          : "No effective active policy is available. Review Policies & Procedures before recording a decision."}
      </small>
    </>
  );
}
