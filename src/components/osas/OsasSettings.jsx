import { requireBackendPersistence } from "../../services/backendPersistence.js";
import SecurityFlow from "../shared/SecurityFlow.jsx";
import { useState } from "react";
import {
  UserRound,
  Bell,
  ShieldCheck,
  SlidersHorizontal,
  LockKeyhole,
  Save,
  Settings,
  CalendarDays,
  Info,
} from "lucide-react";
import { Modal, input, button, primary } from "../tutor/workspace/ui.jsx";

const notificationTypes = [
  "New Case Referral",
  "High-Priority Incident",
  "New Evidence Submitted",
  "Clearance Review Request",
  "Case Status Update",
  "Policy Update",
];
const descriptions = [
  "a case is referred to OSAS",
  "high-priority incidents",
  "new evidence is submitted",
  "student clearance requests",
  "case status changes",
  "updates to policies and procedures",
];
export const defaultSettings = {
  contact: "",
  alternate: "",
  language: "en-PH",
  timezone: "Asia/Manila",
  dateFormat: "long",
  timeFormat: "12",
  pageSize: "6",
  compact: true,
  tips: true,
  showArchived: false,
  notifications: notificationTypes.map(() => ({ email: true, app: true })),
};
export function loadSettings() {
  return structuredClone(defaultSettings);
}

export default function OsasSettings({ settings, onSave }) {
  const [draft, setDraft] = useState(() => structuredClone(settings)),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [security, setSecurity] = useState(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const set = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setNotice("");
  };
  const now = new Date();
  const date =
    draft.dateFormat === "iso"
      ? new Intl.DateTimeFormat("en-CA", {
          timeZone: draft.timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(now)
      : new Intl.DateTimeFormat(draft.language, {
          timeZone: draft.timezone,
          year: "numeric",
          month: draft.dateFormat === "long" ? "short" : "2-digit",
          day: "2-digit",
        }).format(now);
  function save(e) {
    e.preventDefault();
    setError("");
    if (
      draft.contact.trim() &&
      !/^\+?[\d ()-]{7,20}$/.test(draft.contact.trim())
    ) {
      setError("Enter a valid contact number (7–20 characters).");
      return;
    }
    const next = {
      ...draft,
      contact: draft.contact.trim(),
      alternate: draft.alternate.trim(),
    };
    try {
      requireBackendPersistence();
    } catch {
      setError(
        "This action is not connected to the database yet. Nothing was saved.",
      );
    }
  }
  function locked(label, value) {
    return (
      <label className="os-field">
        <span>{label}</span>
        <div className="os-locked">
          <input value={value} readOnly aria-label={label} />
          <LockKeyhole size={12} />
        </div>
        {draft.tips && <small>Managed by authorized administration.</small>}
      </label>
    );
  }
  return (
    <form onSubmit={save} className="os-settings">
      <div className="osas-heading">
        <div>
          <h1>
            Settings <Settings size={22} className="text-green-800" />
          </h1>
          <p>
            Manage your OSAS account, notification, security, and interface
            preferences.
          </p>
        </div>
        <div className="os-date">
          <CalendarDays size={15} />
          {date}
        </div>
      </div>
      <div className="os-settings-grid">
        <section className="os-card">
          <h2>
            <UserRound />
            1. OSAS Profile Information
          </h2>
          <div className="os-profile">
            <span className="os-profile-avatar">OS</span>
            {locked("Full Name", "OSAS Officer")}
            {locked("University Email", "")}
          </div>
          <div className="os-fields">
            {locked("Position / Role", "OSAS Case Officer")}
            {locked("Employee / Staff ID", "")}
            {locked(
              "Office / Department",
              "Office of Student Affairs and Services",
            )}
            <label className="os-field">
              <span>Contact Number</span>
              <input
                className={input}
                value={draft.contact}
                onChange={(e) => set("contact", e.target.value)}
                type="tel"
                maxLength={20}
              />
            </label>
            <label className="os-field">
              <span>Alternate Email</span>
              <input
                className={input}
                value={draft.alternate}
                onChange={(e) => set("alternate", e.target.value)}
                type="email"
                maxLength={254}
              />
            </label>
          </div>
        </section>
        <section className="os-card">
          <h2>
            <Bell />
            2. Notification Preferences
          </h2>
          <table className="os-notifications">
            <thead>
              <tr>
                <th>Notification Type</th>
                <th>Email</th>
                <th>In-App</th>
              </tr>
            </thead>
            <tbody>
              {notificationTypes.map((name, i) => (
                <tr key={name}>
                  <td>
                    <b>{name}</b>
                    {draft.tips && (
                      <small>Notify me when {descriptions[i]}.</small>
                    )}
                  </td>
                  {["email", "app"].map((channel) => (
                    <td key={channel}>
                      <button
                        type="button"
                        role="switch"
                        aria-label={`${name} ${channel === "email" ? "email" : "in-app"}`}
                        aria-checked={draft.notifications[i][channel]}
                        className="os-switch"
                        onClick={() =>
                          set(
                            "notifications",
                            draft.notifications.map((n, j) =>
                              j === i ? { ...n, [channel]: !n[channel] } : n,
                            ),
                          )
                        }
                      >
                        <span />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="os-help">
            Preferences are not connected to the database; notification delivery
            is not connected yet.
          </p>
        </section>
        <section className="os-card">
          <h2>
            <ShieldCheck />
            3. Security &amp; Password
          </h2>
          <div className="os-security-row">
            <b>Password</b>
            <span>Managed by institutional sign-in</span>
            <button
              type="button"
              className={button}
              onClick={() => setSecurity("Change Password")}
            >
              <LockKeyhole size={13} />
              Change Password
            </button>
          </div>
          <div className="os-security-row">
            <b>Two-Factor Authentication</b>
            <span className="text-slate-500">Not connected</span>
            <button
              type="button"
              className={button}
              onClick={() => setSecurity("Manage Security")}
            >
              <ShieldCheck size={13} />
              Manage Security
            </button>
          </div>
          <div className="os-security-row">
            <b>Recent Login</b>
            <span>Unavailable in local demo</span>
          </div>
          <p className="os-help flex items-center gap-2">
            <Info size={13} />
            Security changes require institutional identity verification.
          </p>
        </section>
        <section className="os-card">
          <h2>
            <SlidersHorizontal />
            4. Interface Preferences
          </h2>
          <div className="os-interface">
            <div>
              {[
                ["Language", "language", [["en-PH", "English (Philippines)"]]],
                [
                  "Timezone",
                  "timezone",
                  [["Asia/Manila", "(GMT+08:00) Asia/Manila"]],
                ],
                [
                  "Date Format",
                  "dateFormat",
                  [
                    ["long", "Sep 16, 2026"],
                    ["short", "09/16/2026"],
                    ["iso", "2026-09-16"],
                  ],
                ],
                [
                  "Time Format",
                  "timeFormat",
                  [
                    ["12", "12-hour (01:30 PM)"],
                    ["24", "24-hour (13:30)"],
                  ],
                ],
                [
                  "Items per Page",
                  "pageSize",
                  [
                    ["6", "6 items"],
                    ["10", "10 items"],
                    ["20", "20 items"],
                  ],
                ],
              ].map(([label, key, options]) => (
                <label className="os-select" key={key}>
                  <span>{label}</span>
                  <select
                    className={input}
                    aria-label={label}
                    value={draft[key]}
                    onChange={(e) => set(key, e.target.value)}
                  >
                    {options.map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <small className="os-help">
                Time preview:{" "}
                {new Intl.DateTimeFormat("en-PH", {
                  timeZone: draft.timezone,
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: draft.timeFormat === "12",
                }).format(now)}
              </small>
            </div>
            <div className="os-display">
              <b>Display Preferences</b>
              <label>
                <input
                  type="checkbox"
                  checked={draft.compact}
                  onChange={(e) => set("compact", e.target.checked)}
                />
                Compact table view
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.tips}
                  onChange={(e) => set("tips", e.target.checked)}
                />
                Show tips and help text
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.showArchived ?? false}
                  onChange={(e) => set("showArchived", e.target.checked)}
                />
                Show archived records by default
              </label>
              <p className="os-help">
                Language and timezone follow CSU settings.
              </p>
            </div>
          </div>
        </section>
      </div>
      <div className="os-save">
        <ShieldCheck size={22} />
        <span>
          {dirty
            ? "You have unsaved changes."
            : "Changes apply only to your account and interface."}
        </span>
        {dirty && (
          <button
            type="button"
            className={button}
            onClick={() => {
              setDraft(structuredClone(settings));
              setError("");
              setNotice("Changes discarded.");
            }}
          >
            Discard
          </button>
        )}
        <button className={primary}>
          <Save size={15} />
          Save Changes
        </button>
      </div>
      {(notice || error) && (
        <p
          role={error ? "alert" : "status"}
          className={error ? "text-xs text-red-700" : "text-xs text-green-800"}
        >
          {error || notice}
        </p>
      )}
      {security && (
        <Modal title={security} onClose={() => setSecurity(null)}>
          <SecurityFlow mode={security} onClose={() => setSecurity(null)} />
        </Modal>
      )}
    </form>
  );
}
