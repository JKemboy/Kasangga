// Admin Settings: edits supported alert preferences as an in-memory draft, confirms before save, and delegates persistence to AdminDashboard.
import { useInteractions } from "../shared/InteractionProvider.jsx";
import { useEffect, useState } from "react";
import {
  Settings,
  ShieldCheck,
  CreditCard,
  PieChart,
  Save,
  UserRound,
  Info,
} from "lucide-react";
import { Modal, button, primary, input } from "../tutor/workspace/ui.jsx";
import SecurityFlow from "../shared/SecurityFlow.jsx";
import { useAuth } from "../../auth/AuthProvider.jsx";
import PortalAvatar from "../shared/PortalAvatar.jsx";
export default function AdminSettings({ config, onSave }) {
  const { confirm } = useInteractions();
  const auth = useAuth();

  const [draft, setDraft] = useState({ ...config }),
    [tab, setTab] = useState("System Settings"),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [security, setSecurity] = useState("");
  const accountName =
    [auth?.profile?.first_name, auth?.profile?.last_name]
      .filter(Boolean)
      .join(" ") ||
    auth?.user?.email?.split("@")[0] ||
    "Administrator";
  // Keep unsaved edits in component state only; the latest Supabase snapshot
  // is the source of truth and replaces the draft after it changes.
  useEffect(() => {
    setDraft({ ...config });
  }, [config]);
  const change = (k, v) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setNotice("");
  };
  function toggle(label, key) {
    return (
      <label className="ad-setting-row">
        <span>{label}</span>
        <button
          type="button"
          role="switch"
          aria-label={label}
          aria-checked={draft[key]}
          className="os-switch"
          onClick={() => change(key, !draft[key])}
        >
          <span />
        </button>
      </label>
    );
  }
  function fixed(label, value) {
    return (
      <label className="ad-setting-row">
        <span>{label}</span>
        <input className={input} value={value} readOnly />
      </label>
    );
  }
  async function save(e) {
    e.preventDefault();
    setError("");
    const next = { ...draft };
    const fields = Object.keys(next).filter(
      (k) => k !== "auditHistory" && next[k] !== config[k],
    );
    if (!fields.length) {
      setNotice("No changes to save.");
      return;
    }
    // Require an explicit confirmation before passing Admin preferences to
    // the database save handler; cancelling leaves the Supabase row unchanged.
    if (
      !(await confirm({
        title: "Save Settings?",
        message: `Changes: ${fields.join(", ")}. These updates will be recorded in audit history.`,
        accept: "Save Settings",
      }))
    )
      return;
    next.auditHistory = [
      ...(config.auditHistory || []),
      ...(fields.length
        ? [
            {
              at: new Date().toISOString(),
              by: config.name || "Admin User",
              fields,
            },
          ]
        : []),
    ];
    try {
      // AdminDashboard persists this through admin_save_record into
      // public.system_settings, then refreshes the authoritative snapshot.
      await onSave(next);
      setNotice("Settings saved to the database.");
    } catch (error) {
      setError(error.message);
    }
  }
  return (
    <form
      onSubmit={tab === "System Settings" ? save : (event) => event.preventDefault()}
      className="ad-page"
    >
      <div className="osas-heading">
        <div>
          <h1>
            Settings <Settings size={22} />
          </h1>
          <p>Manage Admin notification preferences and account security.</p>
        </div>
        {tab === "System Settings" && (
          <button className={primary + " flex items-center gap-2"}>
            <Save size={15} />
            Save Settings
          </button>
        )}
      </div>
      <div className="au-tabs">
        {["System Settings", "Account Settings"].map((t) => (
          <button
            type="button"
            key={t}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Account Settings" ? (
        <section className="ad-panel ad-account">
          <h2>
            <UserRound />
            Account Settings
          </h2>
          <div className="mb-4 flex items-center gap-3">
              <PortalAvatar
                role="admin"
                editable
                className="h-16 w-16 rounded-full"
              />
            <p className="ad-help">Click the avatar to update your profile picture.</p>
          </div>
          {[
            ["Full Name", accountName],
            ["Email Address", auth?.user?.email || ""],
            ["Contact Number", ""],
            ["Position", "System Administrator"],
            ["Department", "Information Technology Services"],
          ].map(([label, value]) => (
            <label className="ad-setting-row" key={label}>
              <span>{label}</span>
              <input className={input} value={value} readOnly />
            </label>
          ))}
          <button
            type="button"
            className={button}
            onClick={() => setSecurity("Change Password")}
          >
            Change Password
          </button>
          <p className="ad-help">
            These account details are managed by your institutional sign-in.
          </p>
        </section>
      ) : (
        <div className="ad-settings-grid">
          <div>
            <section className="ad-panel">
              <h2>
                <ShieldCheck />
                Tutor Verification Settings
              </h2>

              {fixed("Automatic Tutor Approval", "Disabled")}
              {fixed("Manual Admin Decision", "Required")}
              <p className="ad-help">
                Admin retains final Tutor approval authority.
              </p>
            </section>
            <section className="ad-panel">
              <h2>
                <PieChart />
                Payment Allocation
              </h2>
              <div className="ad-shares">
                {[
                  ["Tutor Share", 90],
                  ["OSAS Share", 5],
                  ["Platform Share", 5],
                ].map(([l, v]) => (
                  <label key={l}>
                    {l}
                    <input className={input} readOnly value={`${v}%`} />
                  </label>
                ))}
              </div>
              <p className="ad-equation">90% + 5% + 5% = 100%</p>
              <p className="ad-help">
                Default estimates use this split. Recorded transaction
                allocations take precedence in reports.
              </p>
            </section>
          </div>
          <div>
            <section className="ad-panel">
              <h2>
                <CreditCard />
                Payment Configuration
              </h2>
              {fixed("Payment Provider", "PayMongo")}
              {fixed("Payment Method", "GCash")}
              {fixed("Payment Confirmation", "PayMongo webhook")}
              {fixed("Currency", "Philippine Peso (PHP)")}
              <p className="ad-help">
                Payment records reflect the existing verified PayMongo webhook
                workflow.
              </p>
            </section>
            <section className="ad-panel">
              <h2>
                <Settings />
                Platform Configuration
              </h2>
              {fixed("Platform Name", "Kasangga")}
              {fixed("Timezone", "Asia/Manila (UTC+08:00)")}
              {fixed("CSU Email Verification", "Required by platform authentication")}
              <div className="ad-setting-row">
                <span>Admin Multi-Factor Authentication</span>
                <button type="button" className={button} onClick={() => setSecurity("Manage Security")}>
                  Manage Authenticator
                </button>
              </div>
              {fixed("Maintenance Mode", "Not configured for this deployment")}
              <hr />
              {toggle("Tutor Application Alerts", "tutorAlerts")}
              {toggle("Payment Status Alerts", "paymentAlerts")}
              {toggle("Incident Report Alerts", "incidentAlerts")}
              {toggle("System Maintenance Alerts", "maintenanceAlerts")}
            </section>
          </div>
        </div>
      )}
      {tab === "System Settings" && (
        <p className="ad-help flex items-center gap-2">
          <Info size={14} />
          Account and alert preferences are saved in Supabase. Authentication
          policy, maintenance mode, and delivery channels are managed by the
          institution and deployment configuration.
        </p>
      )}
      {notice && (
        <p role="status" className="text-xs text-green-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      {security && (
        <Modal title={security} onClose={() => setSecurity("")}>
          <SecurityFlow mode={security} onClose={() => setSecurity("")} />
        </Modal>
      )}
    </form>
  );
}
