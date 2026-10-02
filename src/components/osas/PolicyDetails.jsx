import { useEffect, useId, useRef } from "react";
import { Archive, X } from "lucide-react";
import "./case-shortcuts.css";
import "./policy-details.css";

export default function PolicyDetails({
  policy,
  policies,
  date,
  onSelect,
  onClose,
}) {
  const dialog = useRef(null);
  const titleId = useId();
  const body = useRef(null);
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  useEffect(() => {
    body.current.scrollTop = 0;
  }, [policy.id]);
  const replacement =
    policy.title === "Legacy Incident Handling Guide"
      ? policies.find(
          (p) => p.title === "Incident Reporting and Referral Guidelines",
        )
      : null;
  return (
    <dialog
      ref={dialog}
      className="ocx-dialog policy-details"
      aria-labelledby={titleId}
      onCancel={onClose}
    >
      <header>
        <div>
          <h2 id={titleId}>{policy.title}</h2>
          <p>
            {policy.category} · {policy.version}
          </p>
        </div>
        <span className={`op-status ${policy.status.toLowerCase()}`}>
          {policy.status}
        </span>
        <button type="button" aria-label="Close policy" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <div className="ocx-body" ref={body}>
        <dl className="policy-facts">
          {[
            ["Title", policy.title],
            [
              "Category",
              <span
                className={`op-category category-${[...new Set(policies.map((p) => p.category))].indexOf(policy.category)}`}
              >
                {policy.category}
              </span>,
            ],
            ["Version", policy.version],
            ["Effective Date", date(policy.effective)],
            ["Document Owner", policy.owner],
            ["Status", policy.status],
            ["Last Updated", date(policy.updated)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {replacement && (
          <div className="policy-archived">
            <Archive size={20} />
            <p>
              Archived. Superseded by{" "}
              <button type="button" onClick={() => onSelect(replacement)}>
                {replacement.title} {replacement.version}
              </button>
              .
            </p>
          </div>
        )}
        <article className="policy-content">
          {policy.title === "Student Code of Conduct" ? (
            <>
              <h3>Purpose</h3>
              <p>
                Sets expectations for respectful, honest, and safe conduct by
                CSU students, including when they use CampusTutor as tutors or
                learners.
              </p>
              <h3>Scope</h3>
              <p>
                Applies to interactions arranged through CampusTutor, whether
                online (external Google Meet or Zoom) or in person on campus.
              </p>
              <h3>Expected conduct</h3>
              <ul>
                <li>Treat others with respect in messages and sessions.</li>
                <li>
                  Uphold academic integrity; tutors guide, they do not complete
                  graded work.
                </li>
                <li>
                  Keep personal information private and use approved campus
                  locations for in-person sessions.
                </li>
              </ul>
              <h3>Due process</h3>
              <p>
                An incident report is an allegation. No sanction is applied
                unless OSAS completes a review under the Institutional Case
                Review Procedure and records a decision.
              </p>
            </>
          ) : replacement ? (
            <>
              <h3>Archived</h3>
              <p>
                Superseded by the {replacement.title} ({replacement.version}).
                Kept for reference only.
              </p>
            </>
          ) : (
            <>
              <h3>
                {policy.status === "Draft"
                  ? "Draft document"
                  : "Policy document"}
              </h3>
              <p>
                {policy.status === "Draft"
                  ? "This draft is under development and is not an active institutional policy."
                  : "The full policy text is not attached to this reference."}{" "}
                Request the approved document from its document owner.
              </p>
            </>
          )}
        </article>
      </div>
      <footer>
        <small>
          View-only. Policy documents are maintained by their document owner.
        </small>
        <button type="button" className="policy-done" onClick={onClose}>
          Done
        </button>
      </footer>
    </dialog>
  );
}
