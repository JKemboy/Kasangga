// OSWE Settings: keeps edits as a draft until Save Changes, then delegates to the OSWE Supabase RPC and refresh flow.
import PortalAvatar from "../shared/PortalAvatar.jsx";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { useEffect, useState } from "react";
import {
  UserRound,
  Bell,
  ShieldCheck,
  SlidersHorizontal,
  LockKeyhole,
  Save,
  Settings,
  CalendarDays,
} from "lucide-react";
import { input, button, primary } from "../tutor/workspace/ui.jsx";

const notificationTypes = [
  "New Case Referral",
  "High-Priority Incident",
  "New Evidence Submitted",
  "Clearance Review Request",
  "Case Status Update",
  "Policy Update",
];
const descriptions = [
  "a case is referred to OSWE",
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
// Defaults initialize the form only; saved values are loaded from the OSWE
// dashboard snapshot and written through its database RPC.
export function loadSettings() {
  return normalizeSettings(defaultSettings);
}
export function normalizeSettings(value = {}) {
  const next = { ...defaultSettings, ...value };
  next.notifications = defaultSettings.notifications.map((defaults, index) => ({
    ...defaults,
    ...(Array.isArray(value.notifications) ? value.notifications[index] : {}),
  }));
  return next;
}
// Match notification records to the OSWE preference row before rendering the
// shared in-app inbox. The backend email queue reads the email switches.
export function filterOsweNotifications(rows = [], settings = defaultSettings) {
  const enabled = settings.notifications || defaultSettings.notifications;
  return rows.filter((notification) => {
    const text =
      `${notification.notificationType || ""} ${notification.title || ""} ${notification.text || ""}`.toLowerCase();
    const index = text.includes("referral")
      ? 0
      : text.includes("priority") || text.includes("high-priority")
        ? 1
        : text.includes("evidence")
          ? 2
          : text.includes("clearance")
            ? 3
            : text.includes("case") && text.includes("status")
              ? 4
              : text.includes("policy")
                ? 5
                : -1;
    return index < 0 || enabled[index]?.app !== false;
  });
}

export default function OsweSettings({ settings, onSave }) {
  const auth = useAuth();
  const [draft, setDraft] = useState(() => normalizeSettings(settings)),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  // Draft edits stay in memory until the user confirms Save Changes; refreshes
  // replace the draft with settings returned from Supabase.
  useEffect(() => {
    setDraft(normalizeSettings(settings));
  }, [settings]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const set = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setNotice("");
  };
  const now = new Date();
  const date =
    draft.dateFormat === "iso"
      ? new Intl.DateTimeFormat("en-CA", {
          timeZone: draft.timezone || "Asia/Manila",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(now)
      : new Intl.DateTimeFormat(draft.language || "en-PH", {
          timeZone: draft.timezone || "Asia/Manila",
          year: "numeric",
          month: draft.dateFormat === "long" ? "short" : "2-digit",
          day: "2-digit",
        }).format(now);
  async function save(e) {
    e.preventDefault();
    setError("");
    const next = normalizeSettings(draft);
    // The parent calls osas_save_record; show success only after that RPC and
    // its follow-up snapshot refresh both complete.
    try {
      await onSave(next);
      setNotice("OSWE preferences saved to Supabase.");
    } catch (cause) {
      setError(cause.message);
    }
  }
  function locked(label, value, hint) {
    return (
      <label className="os-field">
        <span>{label}</span>
        <div className="os-locked">
          <input value={value} readOnly disabled aria-label={label} />
          <LockKeyhole size={12} />
        </div>
        {(hint || draft.tips) && (
          <small>{hint || "Managed by authorized administration."}</small>
        )}
      </label>
    );
  }
  return (
    <form onSubmit={save} className="os-settings">
      <div className="oswe-heading">
        <div>
          <h1>
            Settings <Settings size={22} className="text-green-800" />
          </h1>
          <p>
            Manage your OSWE account, notification, and interface preferences.
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
            1. OSWE Profile Information
          </h2>
          <div className="os-profile">
            <PortalAvatar role="oswe" editable />
            {locked(
              "Full Name",
              [auth?.profile?.first_name, auth?.profile?.last_name]
                .filter(Boolean)
                .join(" "),
            )}
            {locked("University Email", auth?.user?.email || "")}
          </div>
          <div className="os-fields">
            {locked("Position / Role", "OSWE Case Officer")}
            {locked(
              "Employee / Staff ID",
              auth?.profile?.student_id ||
                (auth?.user?.id
                  ? `OSWE-${auth.user.id.toUpperCase()}`
                  : "Loading account ID…"),
              !auth?.profile?.student_id
                ? "System-generated account identifier; not an official CSU employee number."
                : undefined,
            )}
            {locked(
              "Office / Department",
              "Office of Student Affairs and Services",
            )}
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
            Email alerts go to your account email address. Open Notifications in
            your account to review the details. Email and in-app preferences are
            saved separately.
          </p>
        </section>
        <section className="os-card">
          <h2>
            <SlidersHorizontal />
            3. Interface Preferences
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
                {new Intl.DateTimeFormat(draft.language || "en-PH", {
                  timeZone: draft.timezone || "Asia/Manila",
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
              setDraft(normalizeSettings(settings));
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
    </form>
  );
}
