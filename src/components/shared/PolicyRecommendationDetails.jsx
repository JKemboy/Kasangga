import "./policy-recommendation.css";
import { Info } from "lucide-react";
import { osweProcedures } from "../../services/osweProcedures.js";
const citation = (source) =>
  source
    ? `${source.title} · ${source.version} · ${source.section}`
    : "No verified provision matched";
export default function PolicyRecommendationDetails({
  recommendation,
  history,
  compact = false,
  subject,
}) {
  const data = recommendation || {
    status: "unavailable",
    action: null,
    matches: [],
    facts: {
      previousConfirmedSameType: history?.previousCount || 0,
      currentOrdinal:
        history?.currentOrdinal || (history?.previousCount || 0) + 1,
    },
    reason:
      "No current approved provision explicitly supports a recommendation for the recorded facts.",
  };
  const facts = data.facts || {},
    source = data.winningSource;
  if (compact) {
    const previous = facts.previousConfirmedSameType ?? history?.previousCount;
    const reference = osweProcedures.find(
      (procedure) => procedure.title === "Recording a Case Decision",
    );
    return (
      <div className="policy-recommendation compact">
        <Info size={21} aria-hidden="true" />
        <div>
          <strong>
            {previous == null
              ? "Case decision reference"
              : `${previous} prior confirmed same-type violation(s)`}
          </strong>
          <p>
            {subject?.type || facts.incidentType || "Reported incident"} for{" "}
            {subject?.student || "the reported student"}. {reference.title} (
            {reference.version}): first violation, Verbal Warning (or
            Counseled); second, Written Warning; third, Referred for Further
            Action to the VPAA (Handbook 7.3.b, pp. 85&ndash;86).
          </p>
          <p>
            The current allegation is not counted as a confirmed violation. OSWE
            assesses the evidence and records the final decision.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`policy-recommendation ${data.action ? "supported" : "unavailable"}`}
    >
      <strong>
        {data.action
          ? `Suggested Action: ${data.action}`
          : "No verified policy-based recommendation available"}
      </strong>
      <dl>
        <div>
          <dt>Matched Policy or Terms and Conditions</dt>
          <dd>
            {source?.title || "None verified for these recorded facts"}
            {source && ` · ${source.version}`}
          </dd>
        </div>
        <div>
          <dt>Policy Section or Reference</dt>
          <dd>{source?.section || "Not available"}</dd>
        </div>
        <div>
          <dt>Reason for Recommendation</dt>
          <dd>{data.reason}</dd>
        </div>
        <div>
          <dt>Violation History Considered</dt>
          <dd>
            {facts.previousConfirmedSameType || 0} prior confirmed same-type
            violation(s); occurrence {facts.currentOrdinal || 1} currently under
            assessment. The current allegation is not counted as a confirmed
            finding.
          </dd>
        </div>
        {facts.totalEvidenceCount != null && (
          <div>
            <dt>Evidence and severity considered</dt>
            <dd>
              {facts.validatedEvidenceCount || 0} valid;{" "}
              {facts.reviewedEvidenceCount || 0} of {facts.totalEvidenceCount}{" "}
              reviewed.{" "}
              {facts.recordedSeverity
                ? `Recorded severity: ${facts.recordedSeverity}.`
                : "No assessed severity recorded; queue priority does not establish severity."}
            </dd>
          </div>
        )}
      </dl>
      {data.matches?.length > 0 && (
        <details>
          <summary>
            Relevant matched provisions ({data.matches.length}) ·{" "}
            {data.precedence || "No precedence inferred"}
          </summary>
          {data.matches.map((match, index) => (
            <div
              className="policy-recommendation-match"
              key={`${match.kind}-${match.sourceId}-${match.section}-${index}`}
            >
              <strong>{citation(match)}</strong>
              <p>Supports: {match.action}</p>
              <blockquote>{match.excerpt}</blockquote>
              <p>
                Matched criteria:{" "}
                {Object.entries(match.criteria || {})
                  .map(
                    ([key, value]) =>
                      `${key.replaceAll("_", " ")}: ${Array.isArray(value) ? value.join(", ") : value}`,
                  )
                  .join("; ")}
              </p>
            </div>
          ))}
        </details>
      )}
      {facts.history?.length > 0 && (
        <details>
          <summary>Confirmed history records ({facts.history.length})</summary>
          {facts.history.map((entry) => (
            <p key={entry.case_id}>
              CASE-{entry.case_id} · {entry.action} · {entry.decision_date}
            </p>
          ))}
        </details>
      )}
      {!data.action && data.relatedSources?.length > 0 && (
        <details>
          <summary>Related records needing a clear verified provision</summary>
          {data.relatedSources.map((entry) => (
            <p key={`${entry.kind}-${entry.id}`}>
              {entry.title} · {entry.version} · {entry.verification}. A related
              mention alone does not determine a sanction.
            </p>
          ))}
        </details>
      )}
      <p className="policy-recommendation-note">
        {data.action
          ? "Suggested only. OSWE assesses the evidence and makes the final decision."
          : "OSWE may select an action manually and record the basis for its decision."}{" "}
        {facts.evidenceScope}
      </p>
    </div>
  );
}
