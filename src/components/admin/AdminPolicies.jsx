import { useCallback, useEffect, useRef, useState } from "react";
import OsasPolicies from "../osas/OsasPolicies.jsx";
import { Modal, button, input, primary } from "../tutor/workspace/ui.jsx";
import {
  listAdminPolicies,
  saveAdminPolicy,
} from "../../services/adminPolicies.js";

export default function AdminPolicies() {
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null),
    [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const next = await listAdminPolicies();
      if (request === generation.current) {
        setRows(next);
        setError("");
      }
    } catch (cause) {
      if (request === generation.current) setError(cause.message);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      generation.current++;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);
  function edit(value) {
    setFormError("");
    setEditing({ ...value });
  }
  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    try {
      await saveAdminPolicy(editing);
      setEditing(null);
      setNotice("Policy saved to Supabase.");
      await refresh();
    } catch (cause) {
      setFormError(cause.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      {loading && (
        <p role="status" className="m-4 text-sm">
          Loading policies...
        </p>
      )}
      {error && (
        <p role="alert" className="m-4 text-sm text-red-700">
          {error}{" "}
          <button className="underline" onClick={refresh}>
            Retry
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className="m-4 text-sm text-green-800">
          {notice}
        </p>
      )}
      <OsasPolicies
        policies={rows}
        onEdit={edit}
        settings={{ pageSize: 8, timezone: "Asia/Manila", language: "en-PH" }}
      />
      {editing && (
        <Modal
          title="Edit Policy"
          onClose={() => {
            if (!saving) setEditing(null);
          }}
        >
          <form className="space-y-3" onSubmit={save}>
            <fieldset disabled={saving} className="space-y-3">
              {[
                ["title", "Title", "text", 200],
                ["category", "Category", "text", 100],
                ["version", "Version", "text", 30],
                ["owner", "Document Owner", "text", 200],
                ["effective", "Effective Date", "date"],
                ["documentPath", "Document URL (optional)", "url", 2000],
              ].map(([key, label, type, max]) => (
                <label key={key} className="block text-xs font-semibold">
                  {label}
                  <input
                    aria-label={label}
                    className={input + " mt-1"}
                    type={type}
                    maxLength={max}
                    required={
                      !["effective", "documentPath"].includes(key) ||
                      (key === "effective" && editing.status === "Active")
                    }
                    value={editing[key]}
                    onChange={(e) =>
                      setEditing({ ...editing, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label className="block text-xs font-semibold">
                Status
                <select
                  aria-label="Status"
                  className={input + " mt-1"}
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value })
                  }
                >
                  {["Active", "Draft", "Archived"].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold">
                Policy Content
                <textarea
                  aria-label="Policy Content"
                  required
                  rows={12}
                  maxLength={50000}
                  className={input + " mt-1"}
                  value={editing.content}
                  onChange={(e) =>
                    setEditing({ ...editing, content: e.target.value })
                  }
                />
              </label>
              <p className="text-xs text-slate-500">
                Use ## for section headings and - for bullet points. Changes
                appear in the OSAS policy catalog after saving.
              </p>
            </fieldset>
            {formError && (
              <p role="alert" className="text-xs text-red-700">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={button}
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className={primary} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
