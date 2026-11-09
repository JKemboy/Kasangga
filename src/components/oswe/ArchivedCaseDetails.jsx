import { useEffect, useId, useRef, useState } from "react";
import {
  X,
  LockKeyhole,
  FileText,
  ShieldCheck,
  Scale,
  History,
  Eye,
} from "lucide-react";
import { Modal, button } from "../shared/staffUi.jsx";
import EvidenceFile from "./EvidenceFile.jsx";
import "./case-shortcuts.css";
import "./archive-details.css";

export default function ArchivedCaseDetails({ record: r, date, onClose }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  const full = r.full || {};
  const isArchived = !!full.archived;
  const evidence = r.evidence || full.evidence || [];
  const events = [
    { title: "Case review started", when: date(r.opened), by: "OSWE" },
    ...(full.history || []).map((event) => ({
      title: event.action || event.status || "Case action recorded",
      when: event.at
        ? new Date(event.at).toLocaleString()
        : "Date not recorded",
      by: event.officer || event.by || "OSWE",
      notes: event.notes,
    })),
    {
      title: `Decision recorded: ${r.outcome}`,
      when: date(r.resolved),
      by: r.officer,
    },
    {
      title: isArchived
        ? "Case resolved and archived"
        : "Case resolved; clearance follow-up",
      when: date(isArchived ? r.archived : r.resolved),
      by: r.officer,
    },
  ];
  return (
    <dialog
      ref={dialog}
      className="ocx-dialog archive-details"
      aria-labelledby={titleId}
      onCancel={onClose}
    >
      <header>
        <div>
          <h2 id={titleId}>
            {r.caseId}{" "}
            <span className="archive-badge">
              {isArchived ? "Archived" : "Resolved"}
            </span>
          </h2>
          <p>
            {r.type} | {isArchived ? "Archived" : "Resolved"}{" "}
            {date(isArchived ? r.archived : r.resolved)} by {r.officer}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close archived case"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <div className="ocx-body">
        <div className="archive-readonly">
          <LockKeyhole size={20} />
          <div>
            <strong>
              {isArchived
                ? "READ-ONLY ARCHIVED RECORD"
                : "READ-ONLY DECISION RECORD"}
            </strong>
            <p>
              Archived cases cannot be edited, deleted, or have their decision
              changed.
            </p>
          </div>
        </div>
        <dl className="archive-facts">
          {[
            ["Case ID", r.caseId],
            ["Incident Report ID", r.incident],
            [
              "Student (reported party)",
              `${r.student}${r.studentId ? ` · ${r.studentId}` : ""}`,
            ],
            ["Reporter", r.reporter || full.reporter || "Not recorded"],
            ["Incident Type", r.type],
            ["Academic Year", r.year],
            ["Date Opened", date(r.opened)],
            ["Resolution Date", date(r.resolved)],
            [
              isArchived ? "Archived" : "Clearance Follow-up",
              isArchived
                ? `${date(r.archived)} | ${r.officer}`
                : "Student Clearance Review",
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <section>
          <h3>
            <FileText size={16} />
            Incident Description
          </h3>
          <div className="archive-allegation">
            <strong>ALLEGATION AS REPORTED</strong>
            <p>
              {r.description ||
                full.description ||
                "The incident description is not attached to this archived reference."}
            </p>
          </div>
        </section>
        <section>
          <h3>
            <Scale size={16} />
            Case Outcome / Resolution
          </h3>
          <span className="oa-outcome">{r.outcome}</span>
          <p className="archive-resolution">
            {r.resolutionNotes ||
              full.decision?.notes ||
              "The detailed decision basis is not attached to this archived reference."}
          </p>
        </section>
        <section>
          <h3>
            <ShieldCheck size={16} />
            Evidence
          </h3>
          {evidence.length ? (
            evidence.map((item) => (
              <div className="archive-evidence" key={item.id}>
                <FileText size={22} />
                <div>
                  <b>{item.id}</b>
                  <p>{item.filename} | read-only</p>
                </div>
                <button
                  type="button"
                  className={button}
                  onClick={() => setPreview(item)}
                >
                  <Eye size={14} />
                  Preview
                </button>
              </div>
            ))
          ) : (
            <p className="ocx-muted">
              No archived evidence files are attached.
            </p>
          )}
        </section>
        <section>
          <h3>
            <History size={16} />
            Case Timeline
          </h3>
          <ol className="archive-timeline">
            {events.map((event, i) => (
              <li key={i}>
                <b>{event.title}</b>
                <p>
                  {event.when} · {event.by}
                </p>
                {event.notes && <div>{event.notes}</div>}
              </li>
            ))}
          </ol>
        </section>
      </div>
      <footer>
        <small>
          <LockKeyhole size={12} /> Edit, delete, and decision changes are not
          available for archived records.
        </small>
        <button type="button" className="archive-close" onClick={onClose}>
          Close
        </button>
      </footer>
      {preview && (
        <Modal
          title={`Archived Evidence · ${preview.id}`}
          subtitle={preview.filename}
          onClose={() => setPreview(null)}
        >
          <div className="text-sm text-slate-600">
            <p className="mb-3">
              Read-only archived evidence preview loaded from the case record.
            </p>
            <EvidenceFile
              evidence={{
                ...preview,
                fileName: preview.fileName || preview.filename,
              }}
              readOnly
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button className={button} onClick={() => setPreview(null)}>
              Close preview
            </button>
          </div>
        </Modal>
      )}
    </dialog>
  );
}
