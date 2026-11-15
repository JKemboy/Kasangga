import {
  decisionHandbookBasis,
} from "../../services/osweDecisionRules.js";
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
      <dl className="mt-2 grid items-start gap-x-4 gap-y-2 sm:grid-cols-[140px_minmax(0,1fr)] [&>dt]:m-0 [&>dd]:m-0 [&>dd]:min-w-0 [&>dd]:whitespace-pre-wrap [&>dd]:[overflow-wrap:anywhere]">
        <dt className="font-medium">Case action</dt>
        <dd className="break-words">{decision.outcome || "Not recorded"}</dd>
        {decision.workflow === "clearance_handoff" && (
          <>
            <dt className="font-medium">Clearance</dt>
            <dd>
              {decision.conditionDone
                ? "Cleared"
                : "Pending clearance completion"}
            </dd>
          </>
        )}
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
        <dd className="break-words">{decisionHandbookBasis(decision)}</dd>
        {decision.notes && (
          <>
            <dt className="font-medium">Basis</dt>
            <dd className="whitespace-pre-wrap break-words">
              {decision.notes}
            </dd>
          </>
        )}
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
      </dl>
    </section>
  );
}
