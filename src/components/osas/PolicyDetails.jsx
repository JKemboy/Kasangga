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
          {policy.documentPath && /^https:\/\//i.test(policy.documentPath) ? (
            <a
              href={policy.documentPath}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open institutional policy document
            </a>
          ) : (
            <p>
              No document URL is stored for this policy. Contact its document
              owner for the original.
            </p>
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
