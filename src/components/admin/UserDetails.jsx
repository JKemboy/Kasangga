import { useAdminDatabase } from "./AdminDatabaseContext.jsx";
import ServiceDetails from "./ServiceDetails.jsx";
import BookingDetails from "./BookingDetails.jsx";
import { useEffect, useRef, useState } from "react";
import { X, Ban, RotateCcw } from "lucide-react";
import {
  Modal,
  Avatar,
  button,
  primary,
  input,
} from "../tutor/workspace/ui.jsx";
import { dateLabel } from "./adminData.js";
import ApplicationReview from "./ApplicationReview.jsx";
import "./incident-details.css";
import "./user-details.css";

export function changeUserStatus(user, action, form = {}) {
  const target = action === "Suspend User" ? "Suspended" : "Active";
  if (
    target === user.status ||
    (action === "Lift Restriction" && user.status !== "Restricted") ||
    (action === "Reactivate User" && user.status !== "Suspended")
  )
    throw new Error("This action is no longer available.");
  if (!["Suspend User", "Lift Restriction", "Reactivate User"].includes(action))
    throw new Error("Invalid action.");
  if (
    target !== "Active" &&
    (!form.category ||
      form.reason?.trim().length < 15 ||
      !form.reason ||
      !form.ack ||
      !/^\d{4}-\d{2}-\d{2}$/.test(form.reviewDate || ""))
  )
    throw new Error(
      "Complete the category, reason, review date and acknowledgement.",
    );
  return {
    ...user,
    status: target,
    history: [
      ...(user.history || []),
      {
        from: user.status,
        to: target,
        reason: target === "Active" ? action : form.reason.trim(),
        category: form.category || "",
        reviewDate: form.reviewDate || "",
        at: new Date().toISOString(),
        by: "Admin User",
      },
    ],
  };
}
export function Panel({ title, subtitle, children, footer, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="admin-incident-details"
      aria-label={typeof title === "string" ? title : "User details"}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className={button} aria-label="Close details" onClick={onClose}>
          <X size={17} />
        </button>
      </header>
      <div className="aid-body">{children}</div>
      <footer>{footer}</footer>
    </dialog>
  );
}
const pill = (value) => (
  <span
    className={`au-status ${value === "Active" || value === "Verified" ? "active" : value === "Suspended" ? "suspended" : "restricted"}`}
  >
    {value}
  </span>
);
export default function UserDetails({
  user: r,
  applications = [],
  services = [],
  config,
  onSave,
  onServiceSave,
  onApplicationSave,
  onDocument,
  onClose,
}) {
  const [action, setAction] = useState(""),
    [form, setForm] = useState({
      category: "",
      reason: "",
      reviewDate: "",
      ack: false,
    }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [linked, setLinked] = useState(null);
  const { database, saveRecord } = useAdminDatabase();
  const workspace = {
    sessions: database?.sessions || [],
    profile: { name: "" },
  };
  const relatedBookings = workspace.sessions.filter(
    (b) => b.learnerId === r.userId || b.tutorUserId === r.userId,
  );
  const roles = (r.roles || [])
    .map((role) => role.charAt(0).toUpperCase() + role.slice(1))
    .join(" + ");
  const history = r.history || [];
  const current = [...history].reverse().find((h) => h.to === r.status);
  const facts = [
    ["Student ID", r.id],
    ["Name", r.name],
    ["CSU Email", r.email],
    ["College", r.college],
    ["Program", r.program],
    ["Year Level", r.year],
    ["Registration Date", dateLabel(r.registered)],
    [
      "Email Verification",
      r.emailVerified === true
        ? "Verified"
        : r.emailVerified === false
          ? "Unverified"
          : "Unavailable",
    ],
    ["Account Status", pill(r.status)],
    ["Active Roles", roles],
    ...(r.tutor
      ? [
          ["Tutor since", r.tutorSince ? dateLabel(r.tutorSince) : null],
          ["Verified subjects", r.subjects?.join(", ")],
        ]
      : []),
  ];
  const open = (value) => {
    setAction(value);
    setForm({ category: "", reason: "", reviewDate: "", ack: false });
    setError("");
  };
  const [saving, setSaving] = useState(false);
  async function save(e) {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const next = changeUserStatus(r, action, form);
      if (!(await onSave(next)))
        throw new Error(
          "The database did not confirm the save. Refresh and try again.",
        );
      setAction("");
      setNotice("Account status saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  const relatedServices = services.filter((s) => s.tutorUserId === r.userId);
  const relatedApps = applications.filter((a) => a.userId === r.userId);
  return (
    <Panel
      title={
        <>
          <Avatar name={r.name} />
          {r.name} {pill(r.status)}
        </>
      }

      onClose={onClose}
      footer={
        <>
          <div className="ud-actions">
            {r.status === "Suspended" ? (
              <button
                className={primary + " ud-footer-action"}
                onClick={() => open("Reactivate User")}
              >
                <RotateCcw size={15} />
                Reactivate User
              </button>
            ) : (
              <>
                <button
                  className={`${button} ud-footer-action text-red-600`}
                  onClick={() => open("Suspend User")}
                >
                  <Ban size={15} />
                  Suspend User
                </button>
              </>
            )}
          </div>
          <button className={button + " ud-footer-action"} onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <dl>
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "Unavailable"}</dd>
          </div>
        ))}
      </dl>
      <p className="ud-muted">
        {r.tutor
          ? "One account with both capabilities: the Learner role stays alongside Tutor."
          : "Student accounts are Learner by default. Tutor capability requires an approved application."}
      </p>
      {r.status !== "Active" && (
        <section
          className={`ud-status ${r.status === "Suspended" ? "red" : ""}`}
        >
          <h3>
            Account {r.status === "Suspended" ? "Suspension" : "Restriction"}
          </h3>
          <dl>
            {[
              ["Category", current?.category],
              ["Reason", current?.reason],
              [
                "Since",
                current
                  ? `${dateLabel(current.at.slice(0, 10))} by ${current.by}`
                  : null,
              ],
              ["Review by", current?.reviewDate],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v || "Not recorded"}</dd>
              </div>
            ))}
          </dl>
          <p className="ud-muted">
            Platform account administration. This is not an OSAS disciplinary
            decision.
          </p>
        </section>
      )}
      <h3>Linked records</h3>
      <div className="ud-links">
        {relatedApps.map((a) => (
          <button
            className={button}
            key={a.id}
            onClick={() => setLinked({ kind: "application", id: a.id })}
          >
            {a.id} · {a.status}
          </button>
        ))}
        {relatedServices.map((s) => (
          <button
            className={button}
            key={s.id}
            onClick={() => setLinked({ kind: "service", id: s.id })}
          >
            {s.id} · {s.title}
          </button>
        ))}
        {relatedBookings.map((b) => (
          <button
            className={button}
            key={b.id}
            onClick={() => setLinked({ kind: "booking", id: b.id })}
          >
            {b.booking || b.id} ({b.learner === r.name ? "learner" : "tutor"})
          </button>
        ))}
        {!relatedApps.length &&
          !relatedServices.length &&
          !relatedBookings.length && <p>None</p>}
      </div>
      {notice && <p role="status">{notice}</p>}
      {action && (
        <Modal
          title={
            action === "Lift Restriction"
              ? "Lift restriction?"
              : action === "Reactivate User"
                ? `Reactivate ${r.name}?`
                : `Suspend ${r.name}`
          }
          subtitle={`${r.id} · ${roles}`}
          onClose={() => setAction("")}
        >
          <form className="ud-form" onSubmit={save}>
            {action === "Suspend User" ? (
              <>
                <p className="ud-status">
                  This is platform account administration, not an OSAS
                  disciplinary decision.
                </p>
                <label>
                  Category
                  <select
                    className={input}
                    required
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  >
                    <option value="">Select a category</option>
                    {[
                      "Account security",
                      "Spam or unsolicited messaging",
                      "Platform policy violation",
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Reason (required)
                  <textarea
                    className={input}
                    rows={4}
                    required
                    maxLength={2000}
                    value={form.reason}
                    onChange={(e) =>
                      setForm({ ...form, reason: e.target.value })
                    }
                  />
                </label>
                <small>
                  {form.reason.trim().length}/15 characters minimum · saved to
                  the database
                </small>
                <label>
                  Review date
                  <input
                    className={input}
                    type="date"
                    required
                    value={form.reviewDate}
                    onChange={(e) =>
                      setForm({ ...form, reviewDate: e.target.value })
                    }
                  />
                </label>
                <label className="ud-check">
                  <input
                    type="checkbox"
                    checked={form.ack}
                    onChange={(e) =>
                      setForm({ ...form, ack: e.target.checked })
                    }
                  />
                  I understand this changes Kasangga account access.
                </label>
              </>
            ) : (
              <p>
                {r.name}'s account returns to Active with its existing roles (
                {roles}). The previous status remains in Audit Logs. The updated
                status is saved to the database.
              </p>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="ud-actions">
              <button
                type="button"
                className={button}
                onClick={() => setAction("")}
              >
                Cancel
              </button>
              <button
                className={primary}
                disabled={
                  saving ||
                  (action === "Suspend User" &&
                    (!form.category ||
                      form.reason.trim().length < 15 ||
                      !form.reviewDate ||
                      !form.ack))
                }
              >
                {action}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {linked?.kind === "booking" && (
        <BookingDetails
          record={workspace.sessions.find((b) => b.id === linked.id)}
          tutor={workspace.profile.name}
          onClose={() => setLinked(null)}
        />
      )}
      {linked?.kind === "application" && (
        <ApplicationReview
          application={applications.find((a) => a.id === linked.id)}
          account={r}
          config={config}
          onSave={onApplicationSave}
          onDocument={onDocument}
          onClose={() => setLinked(null)}
        />
      )}
      {linked?.kind === "service" && (
        <ServiceDetails
          service={services.find((s) => s.id === linked.id)}
          onSave={onServiceSave}
          onClose={() => setLinked(null)}
        />
      )}
    </Panel>
  );
}
