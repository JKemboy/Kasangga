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
export default function AdminSettings({ config, onSave }) {
  const { confirm } = useInteractions();

  const [draft, setDraft] = useState({ ...config }),
    [tab, setTab] = useState("System Settings"),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [security, setSecurity] = useState(false);
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
    if (!draft.name.trim()) {
      setError("Enter an account name.");
      return;
    }
    const next = { ...draft };
    const fields = Object.keys(next).filter(
      (k) => k !== "auditHistory" && next[k] !== config[k],
    );
    if (!fields.length) {
      setNotice("No changes to save.");
      return;
    }
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
      await onSave(next);
      setNotice("Settings saved to the database.");
    } catch (error) {
      setError(error.message);
    }
  }
  return (
    <form onSubmit={save} className="ad-page">
      <div className="osas-heading">
        <div>
          <h1>
            Settings <Settings size={22} />
          </h1>
          <p>Configure authorized CampusTutor system settings.</p>
        </div>
        <button className={primary + " flex items-center gap-2"}>
          <Save size={15} />
          Save Settings
        </button>
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
          {[
            ["Full Name", "name"],
            ["Email Address", "email"],
            ["Contact Number", "contact"],
            ["Position", "position"],
            ["Department", "department"],
          ].map(([label, key]) => (
            <label className="ad-setting-row" key={key}>
              <span>{label}</span>
              <input
                className={input}
                type={key === "email" ? "email" : "text"}
                required={key === "name" || key === "email"}
                maxLength={150}
                value={draft[key]}
                onChange={(e) => change(key, e.target.value)}
              />
            </label>
          ))}
          <button
            type="button"
            className={button}
            onClick={() => setSecurity(true)}
          >
            Change Password
          </button>
          <p className="ad-help">
            Account details are saved administrator preferences. Institutional
            identity is not modified.
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
              {fixed("Platform Name", "CampusTutor")}
              {fixed("Timezone", "Asia/Manila (UTC+08:00)")}
              {toggle("Require CSU Email Verification", "emailVerification")}
              {toggle("Admin Two-Factor Authentication", "twoFactor")}
              {toggle("Maintenance Mode", "maintenance")}
              <hr />
              {toggle("Tutor Application Alerts", "tutorAlerts")}
              {toggle("Payment Status Alerts", "paymentAlerts")}
              {toggle("Incident Report Alerts", "incidentAlerts")}
              {toggle("System Maintenance Alerts", "maintenanceAlerts")}
            </section>
          </div>
        </div>
      )}
      <p className="ad-help flex items-center gap-2">
        <Info size={14} />
        Preferences are saved in the database. Authentication, maintenance
        enforcement, and notification delivery need backend integration. No
        payment secrets are stored here.
      </p>
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
        <Modal title="Change Password" onClose={() => setSecurity(false)}>
          <p className="text-xs">
            Use your institutional account service to change your password.
            Security settings management is not connected yet.
          </p>
        </Modal>
      )}
    </form>
  );
}
