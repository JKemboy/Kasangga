import { useEffect, useId, useRef } from "react";
import { useLcoRecordSeen } from "../lco/LcoDatabaseContext.jsx";
import { Archive, X } from "lucide-react";
import "./case-shortcuts.css";
import "./policy-details.css";

function policyText(text) {
  return text.split("\n").map((line, index) => {
    const label = line.match(/^([^:\n.!?]{1,90}:)(\s|$)/);
    return (
      <span key={index}>
        {index > 0 && <br />}
        {label ? (
          <>
            <strong>{label[1]}</strong>
            {line.slice(label[1].length)}
          </>
        ) : (
          line
        )}
      </span>
    );
  });
}

export default function PolicyDetails({
  policy,
  policies,
  date,
  onSelect,
  onClose,
  onEdit,
}) {
  useLcoRecordSeen("policies", policy.policyId ?? policy.id);
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
            [
              "Effective Date",
              policy.effectiveLabel || date(policy.effective || policy.added),
            ],
            ["Document Owner", policy.owner],
            ["Status", policy.status],
            ["Last Updated", policy.updatedLabel || date(policy.updated)],
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
        {policy.status === "Draft" && (
          <div className="policy-archived">
            Draft under development. Not in effect and not citable in case
            decisions.
          </div>
        )}
        <article className="policy-content">
          <p>
            <strong>Basis:</strong>{" "}
            {policy.basis ||
              (policy.content?.startsWith("Basis:")
                ? policy.content.split("\n")[0].slice(6).trim()
                : `${policy.owner} — official source pending verification.`)}
          </p>
          {policy.content ? (
            policy.content
              .replace(/^Basis:[^\n]*\n\s*\n/, "")
              .split(/\n\s*\n/)
              .map((block, index) => {
                if (block.startsWith("## ")) {
                  const [heading, ...lines] = block.split("\n");
                  return (
                    <div key={index}>
                      <h3>{heading.slice(3)}</h3>
                      {lines.length > 0 && <p>{policyText(lines.join("\n"))}</p>}
                    </div>
                  );
                }
                // Saved policies also use plain, standalone section headings.
                if (/^[^\n.!?:]{1,80}$/.test(block.trim()))
                  return <h3 key={index}>{block}</h3>;
                if (block.split("\n").every((line) => line.startsWith("- ")))
                  return (
                    <ul key={index}>
                      {block.split("\n").map((line, i) => (
                        <li key={i}>{policyText(line.slice(2))}</li>
                      ))}
                    </ul>
                  );
                return (
                  <p key={index} className="whitespace-pre-wrap">
                    {policyText(block)}
                  </p>
                );
              })
          ) : policy.documentPath &&
            /^https:\/\//i.test(policy.documentPath) ? (
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
          {onEdit
            ? "Changes are saved to the shared policy catalog."
            : "View-only. Policy documents are maintained by their document owner."}
        </small>
        {onEdit && (
          <button type="button" className="policy-done" onClick={onEdit}>
            Edit Policy
          </button>
        )}
        <button type="button" className="policy-done" onClick={onClose}>
          Done
        </button>
      </footer>
    </dialog>
  );
}
