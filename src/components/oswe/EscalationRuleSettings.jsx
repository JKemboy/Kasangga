import { useEffect, useState } from "react";
import { incidentGroups, REPEATED } from "../../services/incidentTypes.js";
import { caseActions } from "../../services/osweDecisionRules.js";
import {
  listEscalationRules,
  saveOccurrenceMapping,
} from "../../services/osweCaseWorkflow.js";
import { input, button, primary } from "../shared/staffUi.jsx";
const occurrenceLabel = (value) =>
  ({ 1: "First", 2: "Second", 3: "Third" })[value];
export default function EscalationRuleSettings() {
  const [rules, setRules] = useState([]),
    [type, setType] = useState(""),
    [occurrence, setOccurrence] = useState(1),
    [action, setAction] = useState(""),
    [basis, setBasis] = useState(""),
    [excerpt, setExcerpt] = useState(""),
    [ack, setAck] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    listEscalationRules()
      .then(setRules)
      .catch((cause) => setError(cause.message));
  }, []);
  useEffect(() => {
    const rule = rules.find(
      (r) => r.incident_type === type && (r.occurrence || 3) === occurrence,
    );
    setAction(rule?.suggested_action || "");
    setBasis(rule?.handbook_basis || "");
    setExcerpt(rule?.official_excerpt || "");
    setAck(false);
  }, [type, occurrence, rules]);
  async function save(removeRule) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveOccurrenceMapping(
        removeRule?.incident_type || type,
        removeRule ? removeRule.occurrence || 3 : occurrence,
        removeRule ? null : action,
        removeRule ? "" : basis.trim(),
        removeRule ? "" : excerpt.trim(),
      );
      setRules(await listEscalationRules());
      window.dispatchEvent(new Event("campustutor:oswe-mapping-updated"));
      setAck(false);
      setNotice(
        removeRule
          ? "Mapping disabled for this incident type and occurrence."
          : "Confirmed mapping saved. Suggestions apply only to this incident type and occurrence; OSWE still chooses the decision.",
      );
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="os-card mt-3">
      <h2>Suggested Action Mapping</h2>
      <p className="mt-2 text-xs text-slate-500">
        Configure each incident type and confirmed same-type occurrence
        separately. No blanket rule is applied to grave or major offenses.
        Missing mappings require manual OSWE assessment.
      </p>
      {!rules.some((rule) => rule.active) && (
        <p className="mt-2 text-xs">
          No confirmed mappings configured. Suggested actions are unassigned.
        </p>
      )}
      {rules
        .filter((rule) => rule.active)
        .map((rule) => (
          <div
            key={`${rule.incident_type}-${rule.occurrence || 3}`}
            className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-xs"
          >
            <span>
              {rule.incident_type} · {occurrenceLabel(rule.occurrence || 3)}{" "}
              occurrence → {rule.suggested_action}
              <small className="block text-slate-500">
                {rule.handbook_basis}
              </small>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                className={button}
                onClick={() => {
                  setType(rule.incident_type);
                  setOccurrence(rule.occurrence || 3);
                }}
              >
                Edit Mapping
              </button>
              <button
                type="button"
                disabled={busy}
                className={button}
                onClick={() => save(rule)}
              >
                Disable Mapping
              </button>
            </div>
          </div>
        ))}
      <fieldset disabled={busy} className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs">
            Incident type
            <select
              className={input + " mt-1"}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Select incident type</option>
              {[
                ...new Set([...Object.values(incidentGroups).flat(), REPEATED]),
              ].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Confirmed same-type occurrence
            <select
              className={input + " mt-1"}
              value={occurrence}
              onChange={(e) => setOccurrence(Number(e.target.value))}
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {occurrenceLabel(n)} occurrence
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Approved suggested action
            <select
              className={input + " mt-1"}
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setAck(false);
              }}
            >
              <option value="">No action assigned</option>
              {caseActions.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Verified policy reference
            <input
              className={input + " mt-1"}
              maxLength={1000}
              value={basis}
              onChange={(e) => {
                setBasis(e.target.value);
                setAck(false);
              }}
              placeholder="Exact approved handbook section or policy reference"
            />
          </label>
        </div>
        <label className="block text-xs">
          Verified official excerpt
          <textarea
            rows={4}
            maxLength={5000}
            className={input + " mt-1"}
            value={excerpt}
            onChange={(e) => {
              setExcerpt(e.target.value);
              setAck(false);
            }}
            placeholder="Record the verified provision that supports this action for this incident type and occurrence."
          />
        </label>
        <label className="flex gap-2 text-xs">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          I verified this action and occurrence mapping against the applicable
          official provision.
        </label>
        <button
          type="button"
          className={primary}
          disabled={
            busy ||
            !type ||
            !action ||
            basis.trim().length < 5 ||
            excerpt.trim().length < 30 ||
            !ack
          }
          onClick={() => save()}
        >
          {busy ? "Saving…" : "Save Confirmed Mapping"}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-2 text-xs text-green-700">
          {notice}
        </p>
      )}
    </section>
  );
}
