import { useEffect, useState } from "react";
import { incidentGroups, REPEATED } from "../../services/incidentTypes.js";
import {
  caseActions,
  THIRD_VIOLATION_BASIS,
} from "../../services/osweDecisionRules.js";
import {
  listEscalationRules,
  saveEscalationRule,
} from "../../services/osweCaseWorkflow.js";
import { input, button, primary } from "../shared/staffUi.jsx";
export default function EscalationRuleSettings() {
  const [rules, setRules] = useState([]),
    [type, setType] = useState(""),
    [action, setAction] = useState(""),
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
  async function save(removeType) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveEscalationRule(
        removeType || type,
        removeType ? null : action,
        removeType ? "" : excerpt.trim(),
      );
      setRules(await listEscalationRules());
      setType("");
      setAction("");
      setExcerpt("");
      setAck(false);
      setNotice(
        removeType
          ? "Mapping disabled. Suggestions remain unassigned for this type."
          : "Official mapping saved. Suggestions still require a manually confirmed decision.",
      );
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="os-card mt-3">
      <h2>{THIRD_VIOLATION_BASIS} — Suggested Action Mapping</h2>
      <p className="mt-2 text-xs text-slate-500">
        No disciplinary action is assumed. Configure a mapping only when the
        official escalation rule is available. A suggestion never selects or
        records a decision automatically.
      </p>
      {!rules.some((rule) => rule.active) && (
        <p className="mt-2 text-xs">
          No official mappings configured. Suggested actions are unassigned.
        </p>
      )}
      {rules
        .filter((rule) => rule.active)
        .map((rule) => (
          <div
            key={rule.incident_type}
            className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-xs"
          >
            <span>
              {rule.incident_type} → {rule.suggested_action}
            </span>
            <button
              type="button"
              disabled={busy}
              className={button}
              onClick={() => save(rule.incident_type)}
            >
              Disable Mapping
            </button>
          </div>
        ))}
      <fieldset disabled={busy} className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs">
            Incident type
            <select
              className={input + " mt-1"}
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setAck(false);
              }}
            >
              <option value="">Select incident type</option>
              {[...Object.values(incidentGroups).flat(), REPEATED].map(
                (name) => (
                  <option key={name}>{name}</option>
                ),
              )}
            </select>
          </label>
          <label className="text-xs">
            Official third-violation action
            <select
              className={input + " mt-1"}
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
                setAck(false);
              }}
            >
              <option value="">No action assigned</option>
              {caseActions.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs">
          Official Section 7.3.b excerpt
          <textarea
            rows={4}
            maxLength={5000}
            className={input + " mt-1"}
            value={excerpt}
            onChange={(event) => {
              setExcerpt(event.target.value);
              setAck(false);
            }}
            placeholder="Paste the confirmed official rule before configuring a suggestion."
          />
        </label>
        <label className="flex gap-2 text-xs">
          <input
            type="checkbox"
            checked={ack}
            onChange={(event) => setAck(event.target.checked)}
          />
          I verified this mapping against the official Section 7.3.b text.
        </label>
        <button
          type="button"
          className={primary}
          disabled={
            busy || !type || !action || excerpt.trim().length < 30 || !ack
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
