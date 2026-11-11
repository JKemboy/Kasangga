import { decisionAppealStatus } from "../../services/osweDecisionRules.js";
export default function RecordedDecisionDetails({ decision }) {
  if (!decision) return null;
  const conditions = decision.conditions?.length
    ? decision.conditions.map((item) => item.text).filter(Boolean)
    : decision.condition
      ? [decision.condition]
      : [];
  return (
    <section className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs">
      <h3 className="font-semibold">Recorded Decision</h3>
      <dl className="mt-2 grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)]">
        <dt className="font-medium">Case action</dt>
        <dd className="break-words">{decision.outcome || "Not recorded"}</dd>
        {decision.rationale && (
          <>
            <dt className="font-medium">Finding rationale</dt>
            <dd className="break-words">{decision.rationale}</dd>
          </>
        )}
        {decision.referralStatus && (
          <>
            <dt className="font-medium">Authority referral</dt>
            <dd className="break-words">
              {decision.referralStatus}
              {decision.authorityResponse && (
                <p>{decision.authorityResponse}</p>
              )}
            </dd>
          </>
        )}
        <dt className="font-medium">Student Handbook basis</dt>
        <dd className="break-words">{decision.basis || "Not recorded"}</dd>
        <dt className="font-medium">Required conditions</dt>
        <dd>
          {conditions.length ? (
            <ul className="list-disc space-y-1 pl-4">
              {conditions.map((text, index) => (
                <li className="whitespace-pre-wrap break-words" key={index}>
                  {text}
                </li>
              ))}
            </ul>
          ) : (
            "No conditions recorded"
          )}
        </dd>
        <dt className="font-medium">Appeal status</dt>
        <dd className="break-words">{decisionAppealStatus(decision)}</dd>
      </dl>
    </section>
  );
}
